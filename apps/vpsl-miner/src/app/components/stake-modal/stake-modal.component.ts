import { Component, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { StakeResultModalComponent } from '../stake-result-modal/stake-result-modal.component';
import { AbstractControl, ValidationErrors, FormControl, FormGroup, Validators } from '@angular/forms';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { BrowserProvider, ethers, Eip1193Provider } from 'ethers';
import StakingABI from '../../assets/contracts/StakingImplemenation.json';
import TokenABI from '../../assets/contracts/TokenImplementation.json';

import { ElectronIpcService } from '../../services/electron-ipc.service';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { WalletType } from '../../models/wallet';
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
  private isHotWallet: boolean = false;
  private signer: ethers.JsonRpcSigner | ethers.Wallet | null = null;
  public stakePeriod: number = 7;
  public availableVFSNBalance: string = '';

  constructor(
    private web3WalletService: Web3WalletService,
    public electronIpcService: ElectronIpcService,
    private existingWalletService: ExistingWalletService,
  ) {
    this.stakingContract = this.web3WalletService.stakingContract;
    this.tokenContract = this.web3WalletService.tokenContract;
    this.isHotWallet = this.electronIpcService.walletType() === WalletType.HOT_WALLET;
    this.availableVFSNBalance = Number(this.web3WalletService.dlpTokenAmount() || 0).toFixed(5);
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

  async stakeCoins() {
    const stakeAmountValue = this.stakeForm.get('stakeAmount')?.value;
    const agreeValue = this.stakeForm.get('agree')?.value;

    if (!stakeAmountValue || !this.stakePeriod || !this.stakingContract || !agreeValue || !this.tokenContract) {
      this.openResultDialog(false, false);
      return;
    }

    try {
      const amountWei = ethers.parseUnits(String(stakeAmountValue) || '0', 18);
      const durationSeconds = BigInt(this.stakePeriod * 24 * 60 * 60);
      const stakingContractAddress = this.stakingContract.target;
      const tokenContractAddress = this.tokenContract.target;

      if(this.isHotWallet) {
        this.signer = this.web3WalletService.wallet?.connect(this.web3WalletService.rpcProvider) || null;
      } else {
        // Create provider without network parameter
        const provider = new BrowserProvider(this.existingWalletService.eip155Provider as unknown as Eip1193Provider);
        // Get signer from provider
        this.signer = await provider.getSigner() || null;
      }
      // Create contract instance with the signer
      const tokenContractWithSigner = new ethers.Contract(tokenContractAddress, TokenABI.abi, this.signer);
      // Create contract instance with the signer
      const stakingContractWithSigner = new ethers.Contract(stakingContractAddress, StakingABI.abi, this.signer);
      this.openResultDialog(true, false);
      const approveTx = await tokenContractWithSigner['approve'](stakingContractAddress, amountWei);
      await approveTx.wait();

      // Stake tokens
      const stakeTx = await stakingContractWithSigner['stakeTokens'](amountWei, durationSeconds);
      await stakeTx.wait();
      this.matDialog.closeAll();
      this.openResultDialog(false, true, Number(stakeAmountValue)?.toFixed(5), this.stakePeriod?.toString());
    } catch (error) {
      console.error('Error staking coins:', error);
      this.matDialog.closeAll();
      this.openResultDialog(false, false);
    }
  }

  positiveNumberValidator(control: AbstractControl): ValidationErrors | null {
    const value = parseFloat(control.value);
    return value > 0 ? null : { positiveNumber: true };
  }

  maxBalanceValidator(control: AbstractControl): ValidationErrors | null {
    const inputValue = parseFloat(control.value);
    const availableBalance = parseFloat(this.availableVFSNBalance);
    return inputValue > availableBalance ? { maxBalance: true } : null;
  }

  openResultDialog(isLoading: boolean, isSuccess: boolean, stakeAmount?: string, stakePeriod?: string): void {
    this.matDialog.open(StakeResultModalComponent, {
      panelClass: 'custom-dialog-container',
      width: '900px',
      disableClose: true,
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

  stakeAll(): void {
    this.stakeForm.get('stakeAmount')?.setValue(this.availableVFSNBalance?.toString());
  }
}
