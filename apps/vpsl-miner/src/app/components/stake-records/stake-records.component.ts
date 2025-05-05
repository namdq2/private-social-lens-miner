import { Component, inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { BrowserProvider, Eip1193Provider, ethers } from 'ethers';
import StakingABI from '../../assets/contracts/StakingImplemenation.json';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { CryptographyService } from '../../services/cryptography.service';
import { calculateTimeRemaining, formatUnixTimestampToDateString } from '../../shared/helpers';
import { StakeResultModalComponent } from '../stake-result-modal/stake-result-modal.component';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { ReconnectInstructionDialogComponent } from '../reconnect-instruction-dialog/reconnect-instruction-dialog.component';
import { WalletType } from '../../models/wallet';

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
  private signer: ethers.JsonRpcSigner | ethers.Wallet | null = null;
  public displayedColumns: string[] = ['amount', 'startTime', 'timeRemaining', 'hasWithdrawn'];
  public dataSource = new MatTableDataSource<StakeRecord>(ELEMENT_DATA);
  public unstakingItem: StakeRecord | null = null;
  public reloadActiveStakesPending: boolean = false;
  public availableVFSNBalance: string = '';
  public isHotWallet: boolean = false;

  constructor(private web3WalletService: Web3WalletService, private cryptographyService: CryptographyService, private electronIpcService: ElectronIpcService, private existingWalletService: ExistingWalletService) {
    this.stakingContract = this.web3WalletService.stakingContract;
    this.walletAddress = this.web3WalletService.walletAddress();
    this.availableVFSNBalance = Number(this.web3WalletService.dlpTokenAmount() || 0).toFixed(5);
    this.isHotWallet = this.electronIpcService.walletType() === WalletType.HOT_WALLET;
    this.loadActiveStakes();
  }

  checkIsConnected() {
    if(!this.existingWalletService.eip155Provider || !this.existingWalletService?.reownAppKit?.getIsConnectedState()) {
      this.existingWalletService.isConnected.set(false);
    } else {
      this.existingWalletService.isConnected.set(true);
    }
  }

  async onUnStake(stake: StakeRecord) {
    this.checkIsConnected();

    if(!this.existingWalletService.isConnected()) {
      this.openReconnectInstructionDialog();
      return;
    }

    if (!this.stakingContract || !stake || !this.existingWalletService.eip155Provider) {
      this.openResultDialog(false, false); 
      return;
    }

    try {
      // Create provider without network parameter
      const provider = new BrowserProvider(this.existingWalletService.eip155Provider as unknown as Eip1193Provider);
      // Get signer from provider
      this.signer = await provider.getSigner() || null;
      // create contract instance with signer
      const stakingContractAddress = this.stakingContract.target;
      const stakingContractWithSigner = new ethers.Contract(stakingContractAddress, StakingABI.abi, this.signer);
      this.unstakingItem = stake;
      // unstake tokens
      this.openResultDialog(true, false, true);  
      const tx = await stakingContractWithSigner['unstakeTokens'](stake.stakeIndex);
      await tx.wait();
      this.loadActiveStakes();
      this.matDialog.closeAll();
      this.openResultDialog(false, true, true, stake.amount);  
    } catch (error) {
      console.error('Error unstaking:', error);
      this.matDialog.closeAll();
      this.openResultDialog(false, false, true);  
    } finally {
      this.unstakingItem = null;
      await this.web3WalletService.calculateBalance();
      this.availableVFSNBalance = Number(this.web3WalletService.dlpTokenAmount() || 0).toFixed(5);
    }
  }

  async onReload() {
    this.reloadActiveStakesPending = true;
    await this.loadActiveStakes();
    this.reloadActiveStakesPending = false;
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
    } finally {
      await this.web3WalletService.calculateBalance();
      this.availableVFSNBalance = Number(this.web3WalletService.dlpTokenAmount() || 0).toFixed(5);
    }
  }

  openResultDialog(isLoading: boolean, isSuccess: boolean, isUnstake?: boolean, stakeAmount?: number, stakePeriod?: number): void {
    this.matDialog.open(StakeResultModalComponent, {
      disableClose: true,
      panelClass: 'custom-dialog-container',
      width: '100%',
      maxWidth: '800px',
      data: { isLoading, isSuccess, stakeAmount, stakePeriod, isUnstake },
    });
  }

  openReconnectInstructionDialog(): void {
    this.matDialog.open(ReconnectInstructionDialogComponent, {
      width: '500px',
      disableClose: true,
    });
  }

  onBackToStakePlace() {
    this.router.navigate(['/app/stake-place']);
  }
}
