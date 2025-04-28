import { Component, inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { StakeModalComponent } from '../stake-modal/stake-modal.component';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { ethers } from 'ethers';
import StakingABI from '../../assets/contracts/StakingImplemenation.json';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { CryptographyService } from '../../services/cryptography.service';
import { PasswordDialogueComponent } from '../password-dialog/password-dialogue.component';
import { calculateTimeRemaining, formatUnixTimestampToDateString } from '../../shared/helpers';
import { StakeResultModalComponent } from '../stake-result-modal/stake-result-modal.component';

interface StakeRecord {
  amount: number;
  startTime: string;
  timeRemaining: string;
  hasWithdrawn: boolean;
  stakeIndex: number;
  stakingPeriodOver: boolean;
}

interface IStakeItemResponse {
  amount: number;
  startTime: bigint;
  duration: bigint;
  hasWithdrawn: boolean;
  stakeIndex: number;
}

const ELEMENT_DATA: StakeRecord[] = [];

@Component({
  selector: 'app-stake-records',
  standalone: false,
  templateUrl: './stake-records.component.html',
  styleUrls: ['./stake-records.component.scss'],
})
export class StakeRecordsComponent {
  private readonly router: Router = inject(Router);
  private readonly matDialog: MatDialog = inject(MatDialog);
  private stakingContract: ethers.Contract | null = null;
  private walletAddress: string = ''; 
  private rpcProvider: ethers.JsonRpcProvider | null = null;
  private password: string = '';
  public displayedColumns: string[] = ['amount', 'startTime', 'timeRemaining', 'hasWithdrawn'];
  public dataSource = new MatTableDataSource<StakeRecord>(ELEMENT_DATA);
  public unstakingItem: StakeRecord | null = null;
  public loadActiveStakesPending: boolean = false;
  public availableVFSNBalance: string = '';

  constructor(private web3WalletService: Web3WalletService, private cryptographyService: CryptographyService, private electronIpcService: ElectronIpcService) {
    this.stakingContract = this.web3WalletService.stakingContract;
    this.walletAddress = this.web3WalletService.walletAddress();
    this.rpcProvider = new ethers.JsonRpcProvider(this.web3WalletService.rpcUrl);
    this.availableVFSNBalance = Number(this.web3WalletService.dlpTokenAmount() || 0).toFixed(5);
    this.loadActiveStakes();
  }

  openStakeDialog(): void {
    this.matDialog.open(StakeModalComponent, {
      panelClass: 'custom-dialog-container',
      data: {
        /* data */
      },
    });
  }

  async onUnStake(stake: StakeRecord) {
    const privateKey = this.cryptographyService.decryptPrivateKey(this.electronIpcService.privateKey(), this.password, this.electronIpcService.salt());

    if (!this.stakingContract || !privateKey) {
      this.password = '';
      this.openResultDialog(false, false); 
      return;
    }

    try {
      const stakingContractAddress = this.stakingContract.target;
      const wallet = new ethers.Wallet(privateKey);
      const signer = wallet.connect(this.rpcProvider);
      const stakingContractWithSigner = new ethers.Contract(stakingContractAddress, StakingABI.abi, signer);
      this.unstakingItem = stake;
      const tx = await stakingContractWithSigner['unstakeTokens'](stake.stakeIndex);
      await tx.wait();
      this.loadActiveStakes();
    } catch (error) {
      console.error('Error unstaking:', error);
      this.openResultDialog(false, false);  
    } finally {
      this.unstakingItem = null;
      this.password = '';
    }
  }

  async onReload() {
    this.loadActiveStakesPending = true;
    await this.loadActiveStakes();
    this.loadActiveStakesPending = false;
  }

  async loadActiveStakes() {
    if (!this.stakingContract) {
      return;
    }

    try {
      const activeStakes = await this.stakingContract?.['getActiveStakes'](this.walletAddress);

      const stakeRecords: StakeRecord[] = activeStakes.map((stake: IStakeItemResponse, index: number) => {
        const formattedStartTime = formatUnixTimestampToDateString(stake.startTime);
        const timeRemaining = calculateTimeRemaining(stake.startTime, stake.duration);
        return {
          amount: ethers.formatUnits(stake.amount, 18),
          startTime: formattedStartTime,
          timeRemaining: timeRemaining.remainingTime,
          hasWithdrawn: stake.hasWithdrawn,
          stakeIndex: index,
          stakingPeriodOver: timeRemaining.isRemainingTimeZero,
        };
      });

      this.dataSource.data = stakeRecords;
    } catch (error) {
      console.error('Error fetching active stakes:', error);
    }
  }

  onOpenPasswordDialog(stake: StakeRecord): void {
    const dialogRef = this.matDialog.open(PasswordDialogueComponent, {
      width: '500px',
      data: { isForCreate: false },
    });

    dialogRef.afterClosed().subscribe((password: string) => {
      if (password) {
        this.password = password;
        this.onUnStake(stake);
      }
    });
  }

  openResultDialog(isLoading: boolean, isSuccess: boolean): void {
    this.matDialog.open(StakeResultModalComponent, {
      panelClass: 'custom-dialog-container',
      data: { isLoading, isSuccess },
    });
  }

  onBackToStakePlace() {
    this.router.navigate([], { queryParams: { viewStakeRecords: 'false' } });
  }
}
