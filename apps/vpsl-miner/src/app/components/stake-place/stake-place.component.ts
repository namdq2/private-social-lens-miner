import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { StakeResultModalComponent } from '../stake-result-modal/stake-result-modal.component';
import { AbstractControl, ValidationErrors, FormControl, FormGroup, Validators } from '@angular/forms';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { BrowserProvider, ethers, Eip1193Provider } from 'ethers';
import StakingABI from '../../assets/contracts/StakingImplemenation.json';
import TokenABI from '../../assets/contracts/TokenImplementation.json';
import { BN } from 'bn.js';


import { ElectronIpcService } from '../../services/electron-ipc.service';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { WalletType } from '../../models/wallet';
import { ReconnectInstructionDialogComponent } from '../reconnect-instruction-dialog/reconnect-instruction-dialog.component';
@Component({
  selector: 'app-stake-place',
  standalone: false,
  templateUrl: './stake-place.component.html',
  styleUrl: './stake-place.component.scss',
})

export class StakePlaceComponent {
  private readonly matDialog: MatDialog = inject(MatDialog);
  private stakingContract: ethers.Contract | null = null;
  private tokenContract: ethers.Contract | null = null;
  private signer: ethers.JsonRpcSigner | ethers.Wallet | null = null;
  public stakePeriod: number = 7;
  public availableVFSNBalance: string = '';
  public isHotWallet: boolean = false;

  constructor(
    private web3WalletService: Web3WalletService,
    public electronIpcService: ElectronIpcService,
    private existingWalletService: ExistingWalletService,
  ) {
    this.stakingContract = this.web3WalletService.stakingContract;
    this.tokenContract = this.web3WalletService.tokenContract;
    this.availableVFSNBalance = Number(this.web3WalletService.dlpTokenAmount() || 0).toFixed(5);
    this.isHotWallet = this.electronIpcService.walletType() === WalletType.HOT_WALLET;
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

  checkIsConnected() {
    if(!this.existingWalletService.eip155Provider || !this.existingWalletService?.reownAppKit?.getIsConnectedState()) {
      this.existingWalletService.isConnected.set(false);
    } else {
      this.existingWalletService.isConnected.set(true);
    }
  }

  async stakeCoins() {
    this.checkIsConnected();

    if(!this.existingWalletService.isConnected()) {
      this.openReconnectInstructionDialog();
      return;
    }
    
    const stakeAmountValue = this.stakeForm.get('stakeAmount')?.value;
    const agreeValue = this.stakeForm.get('agree')?.value;

    if (!stakeAmountValue || !this.stakePeriod || !this.stakingContract || !agreeValue || !this.tokenContract || !this.existingWalletService.eip155Provider) {
      this.openResultDialog(false, false);
      return;
    }

    try {
      const amountWei = ethers.parseUnits(String(stakeAmountValue) || '0', 18);
      const durationSeconds = BigInt(this.stakePeriod * 24 * 60 * 60);
      const stakingContractAddress = this.stakingContract.target;
      const tokenContractAddress = this.tokenContract.target;
      // Create provider without network parameter
      const provider = new BrowserProvider(this.existingWalletService.eip155Provider as unknown as Eip1193Provider);
      // Get signer from provider
      this.signer = await provider.getSigner() || null;
      // Create contract instance with the signer
      const tokenContractWithSigner = new ethers.Contract(tokenContractAddress, TokenABI.abi, this.signer);
      const stakingContractWithSigner = new ethers.Contract(stakingContractAddress, StakingABI.abi, this.signer);
      this.openResultDialog(true, false);

      const allowanceBigInt = await tokenContractWithSigner['allowance'](
        this.signer.address,
        stakingContractAddress
      );
      //approve tokens
      if (!(new BN(String(allowanceBigInt)).gte(new BN(String(amountWei))))) { 
        const maxUint256 = ethers.MaxUint256;
        const approveTx = await tokenContractWithSigner['approve'](stakingContractAddress, maxUint256);
        await approveTx.wait();
      }
      // Stake tokens
      const stakeTx = await stakingContractWithSigner['stakeTokens'](amountWei, durationSeconds);
      await stakeTx.wait();
      this.matDialog.closeAll();
      this.openResultDialog(false, true, Number(stakeAmountValue)?.toFixed(5), this.stakePeriod?.toString());
    } catch (error) {
      console.error('Error staking coins:', error);
      this.matDialog.closeAll();
      this.openResultDialog(false, false);
    } finally {
      //re calculate balance
      await this.web3WalletService.calculateBalance();
      this.stakeForm.reset();
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
      width: '100%',
      maxWidth: '800px',
      disableClose: true,
      data: {
        isLoading: isLoading,
        isSuccess: isSuccess,
        stakeAmount: stakeAmount,
        stakePeriod: stakePeriod,
      },
    });
  }

  openReconnectInstructionDialog(): void {
    this.matDialog.open(ReconnectInstructionDialogComponent, {
      width: '500px',
      disableClose: true,
    });
  }

  updateStakePeriod(period: number): void {
    this.stakePeriod = period;
  }

  stakeAll(): void {
    this.stakeForm.get('stakeAmount')?.setValue(this.availableVFSNBalance?.toString());
  }
}

