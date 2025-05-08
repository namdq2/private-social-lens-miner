import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { SendTokenConfirmationDialogComponent } from '../send-token-confirmation-dialog/send-token-confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { BrowserProvider, ethers } from 'ethers';
import TokenABI from '../../assets/contracts/TokenImplementation.json';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { TokenTransferType } from '../../models/token-transfer';
import { ReconnectInstructionDialogComponent } from '../reconnect-instruction-dialog/reconnect-instruction-dialog.component';

@Component({
  selector: 'app-send-tokens',
  templateUrl: './send-tokens.component.html',
  standalone: false,
  styleUrl: './send-tokens.component.scss',
})
export class SendTokensComponent {
  private vfsnTokenAddress: string | null = null;
  public vanaBalance: string = '';
  public vfsnBalance: string = '';
  public sendForm: FormGroup;
  public isCalculatingGas: boolean = false;
  public TokenTransferType = TokenTransferType;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private matDialog: MatDialog,
    private web3WalletService: Web3WalletService,
    private existingWalletService: ExistingWalletService,
  ) {
    this.vanaBalance = Number(this.web3WalletService.vanaTokenAmount() || 0).toFixed(5);
    this.vfsnBalance = Number(this.web3WalletService.dlpTokenAmount() || 0).toFixed(5);
    this.vfsnTokenAddress = this.web3WalletService.tokenContract?.target as string || '';
    this.sendForm = this.fb.group({
      selectedToken: [TokenTransferType.VFSN, Validators.required],
      recipientAddress: ['', [Validators.required, Validators.pattern(/^0x[a-fA-F0-9]{40}$/)]],
      tokenAmount: ['', [Validators.required, this.positiveNumberValidator(), this.maxBalanceValidator()]],
    });
  }

  validateNumericInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Allow only numbers and up to 5 decimal places
    const regex = /^\d*\.?\d{0,5}$/;
    if (!regex.test(value)) {
      input.value = value.slice(0, -1);
    }
  }

  checkIsConnected() {
    if(!this.existingWalletService.eip155Provider || !this.existingWalletService?.reownAppKit?.getIsConnectedState()) {
      this.existingWalletService.isConnected.set(false);
    } else {
      this.existingWalletService.isConnected.set(true);
    }
  }

  positiveNumberValidator() {
    return (control: any) => {
      const value = parseFloat(control.value);
      if (isNaN(value) || value <= 0) {
        return { positiveNumber: true };
      }
      return null;
    };
  }

  maxBalanceValidator() {
    return (control: any) => {
      const value = parseFloat(control.value);
      const selectedToken = this.sendForm?.get('selectedToken')?.value;
      const maxBalance = parseFloat(selectedToken === TokenTransferType.VFSN ? this.vfsnBalance : this.vanaBalance);
      if (value > maxBalance) {
        return { maxBalance: true };
      }
      return null;
    };
  }

  selectToken(token: TokenTransferType): void {
    // Reset token amount when switching tokens
    const recipientAddress = this.sendForm.get('recipientAddress')?.value;
    this.sendForm.reset();
    this.sendForm.patchValue({ 
      recipientAddress, 
      selectedToken: token 
    });
  }

  sendAll(): void {
    this.sendForm.get('tokenAmount')?.setValue(this.sendForm.get('selectedToken')?.value === TokenTransferType.VFSN ? this.vfsnBalance : this.vanaBalance);
  }

  async openConfirmationDialog(): Promise<void> {
    this.checkIsConnected();

    if(!this.existingWalletService.isConnected()) {
      this.openReconnectInstructionDialog();
      return;
    }

    const estimatedGas = await this.onCalculateGas();

    this.dialog.open(SendTokenConfirmationDialogComponent, {
      width: '100%',
      maxWidth: '800px',
      disableClose: true,
      data: {
        recipientAddress: this.sendForm.get('recipientAddress')?.value,
        tokenAmount: this.sendForm.get('tokenAmount')?.value,
        tokenSymbol: this.sendForm.get('selectedToken')?.value,
        estimatedGas,
        onResetForm: this.onResetForm.bind(this),
      },
    });
  }

  onResetForm(): void {
    const selectedToken = this.sendForm.get('selectedToken')?.value;
    this.sendForm.reset();
    this.sendForm.patchValue({ selectedToken });
  }

  async onCalculateGas(): Promise<string> {
    const tokenAmount = this.sendForm.get('tokenAmount')?.value;
    const recipientAddress = this.sendForm.get('recipientAddress')?.value;

    if (!tokenAmount || !recipientAddress || !this.vfsnTokenAddress || !this.existingWalletService.eip155Provider) {
      return '0';
    }

    try {
      this.isCalculatingGas = true;
      const provider = new BrowserProvider(this.existingWalletService.eip155Provider);
      const gasPrice = await provider.getFeeData();
      if (this.sendForm.get('selectedToken')?.value === TokenTransferType.VFSN) {
        const amount = ethers.parseUnits(tokenAmount, 18);
        const signer = await provider.getSigner();
        const tokenContract = new ethers.Contract(this.vfsnTokenAddress, TokenABI.abi, signer);
        // Get estimated gas limit for the transfer
        const gasLimit = await tokenContract['transfer'].estimateGas(recipientAddress, amount);
        // Calculate estimated gas fee directly in VANA
        const estimatedGasFee = gasLimit * (gasPrice.gasPrice || 0n);
        const estimatedGas = Number(ethers.formatEther(estimatedGasFee) || 0).toFixed(5);
        return estimatedGas;
      } else {
        const gasPrice = await provider.getFeeData();
        const gasLimit = 21000n; // Standard gas limit for native transfers
        const estimatedGasFee = gasLimit * (gasPrice.gasPrice || 0n);
        const estimatedGas = Number(ethers.formatEther(estimatedGasFee) || 0).toFixed(5);
        return estimatedGas;
      }
    } catch (error) {
      console.error('Error estimating gas:', error);
      return '0';
    } finally {
      this.isCalculatingGas = false;
    }
  }

  openReconnectInstructionDialog(): void {
    this.matDialog.open(ReconnectInstructionDialogComponent, {
      width: '500px',
      disableClose: true,
    });
  }

}
