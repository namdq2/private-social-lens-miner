import { Component, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { StakeResultModalComponent } from '../stake-result-modal/stake-result-modal.component';
import { AbstractControl, ValidationErrors, FormControl, FormGroup, Validators } from '@angular/forms';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { ethers } from 'ethers';
import StakingABI from '../../assets/contracts/StakingImplemenation.json';
import TokenABI from '../../assets/contracts/TokenImplementation.json';

import { ElectronIpcService } from '../../services/electron-ipc.service';
import { CryptographyService } from '../../services/cryptography.service';
import { PasswordDialogueComponent } from '../password-dialog/password-dialogue.component';
@Component({
  selector: 'app-stake-modal',
  standalone: false,
  templateUrl: './stake-modal.component.html',
  styleUrl: './stake-modal.component.scss',
})
export class StakeModalComponent {
  private dialogRef: MatDialogRef<StakeModalComponent> = inject(MatDialogRef);
  private readonly matDialog: MatDialog = inject(MatDialog);
  private stakingContract: ethers.Contract | null = null;
  private tokenContract: ethers.Contract | null = null;
  private privateKey: string = '';
  private password: string = '';
  private rpcProvider: ethers.JsonRpcProvider | null = null;
  public stakePeriod: number = 7;
  public availableVFSNBalance: string = '';

  constructor(private web3WalletService: Web3WalletService, public electronIpcService: ElectronIpcService, private cryptographyService: CryptographyService) {
    this.stakingContract = this.web3WalletService.stakingContract;
    this.tokenContract = this.web3WalletService.tokenContract;
    this.availableVFSNBalance = Number(this.web3WalletService.dlpTokenAmount() || 0).toFixed(5);
    this.rpcProvider = new ethers.JsonRpcProvider(this.web3WalletService.rpcUrl);
  }

  public stakeForm = new FormGroup({
    stakeAmount: new FormControl('', [Validators.required, this.positiveNumberValidator.bind(this), this.maxBalanceValidator.bind(this)]),
    agree: new FormControl(false, Validators.requiredTrue),
  });

  validateNumericInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Allow numbers with up to 5 decimal places
    const regex = /^\d*\.?\d{0,5}$/;
    if (!regex.test(value)) {
      const match = value.match(/^\d*\.?\d{0,5}/);
      input.value = match ? match[0] : '';
    }
    this.stakeForm.get('stakeAmount')?.setValue(input.value);
  }

  async approveAllowance(spenderAddress: string, amount: string, signer: ethers.Wallet) {
    if (this.tokenContract) {
      const tokenContractAddress = this.tokenContract.target;
      const erc20ContractWithSinger = new ethers.Contract(tokenContractAddress, TokenABI.abi, signer);

      try {
        const amountWei = ethers.parseUnits(amount, 18);
        const tx = await erc20ContractWithSinger['approve'](spenderAddress, amountWei);
        await tx.wait();
      } catch (error) {
        console.error('Error approving allowance:', error);
      }
    }
  }

  async stakeCoins() {
    const stakeAmountValue = this.stakeForm.get('stakeAmount')?.value;
    const agreeValue = this.stakeForm.get('agree')?.value;
    this.privateKey = this.cryptographyService.decryptPrivateKey(this.electronIpcService.privateKey(), this.password, this.electronIpcService.salt());

    if (!stakeAmountValue || !this.stakePeriod || !this.stakingContract || !agreeValue || !this.privateKey) {
      this.password = '';
      this.openResultDialog(false, false);
      return;
    }

    try {
      const amountWei = ethers.parseUnits(stakeAmountValue?.toString() || '0', 18);
      const durationSeconds = BigInt(this.stakePeriod * 24 * 60 * 60); //convert to seconds
      const stakingContractAddress = this.stakingContract.target;
      const wallet = new ethers.Wallet(this.privateKey);
      const signer = wallet.connect(this.rpcProvider);

      this.openResultDialog(true, false);
      await this.approveAllowance(stakingContractAddress?.toString(), amountWei?.toString(), signer); //approve on token contract first

      const stakingContractWithSigner = new ethers.Contract(stakingContractAddress, StakingABI.abi, signer);
      const tx = await stakingContractWithSigner['stakeTokens'](amountWei, durationSeconds);
      await tx.wait();
      this.matDialog.closeAll();

      this.openResultDialog(false, true, Number(stakeAmountValue)?.toFixed(5), this.stakePeriod?.toString());
    } catch (error) {
      console.error('Error staking coins:', error);
      this.matDialog.closeAll();
      this.openResultDialog(false, false);
    } finally {
      this.password = '';
    }
  }

  positiveNumberValidator(control: AbstractControl): ValidationErrors | null {
    return control.value > 0 ? null : { positiveNumber: true };
  }

  maxBalanceValidator(control: AbstractControl): ValidationErrors | null {
    return control.value > this.availableVFSNBalance ? { maxBalance: true } : null;
  }

  openResultDialog(isLoading: boolean, isSuccess: boolean, stakeAmount?: string, stakePeriod?: string): void {
    this.matDialog.open(StakeResultModalComponent, {
      panelClass: 'custom-dialog-container',
      width: '900px',
      disableClose: false,
      data: {
        isLoading: isLoading,
        isSuccess: isSuccess,
        stakeAmount: stakeAmount,
        stakePeriod: stakePeriod,
      },
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  updateStakePeriod(period: number): void {
    this.stakePeriod = period;
  }

  onOpenPasswordDialog(): void {
    const dialogRef = this.matDialog.open(PasswordDialogueComponent, {
      width: '500px',
      data: { isForCreate: false },
    });

    dialogRef.afterClosed().subscribe((password: string) => {
      if (password) {
        this.password = password;
        this.stakeCoins();
        this.onNoClick();
      }
    });
  }

  stakeAll(): void {
    this.stakeForm.get('stakeAmount')?.setValue(this.availableVFSNBalance?.toString());
  }
}
