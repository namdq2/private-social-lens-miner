import { Component, Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { BrowserProvider, ethers } from 'ethers';
import TokenABI from '../../assets/contracts/TokenImplementation.json';
import { TokenTransferType } from '../../models/token-transfer';
import { SendTokenResultModalComponent } from '../send-token-result-modal/send-token-result-modal.component';

@Component({
  selector: 'app-send-token-confirmation-dialog',
  standalone: false,
  templateUrl: './send-token-confirmation-dialog.component.html',
  styleUrls: ['./send-token-confirmation-dialog.component.scss']
})

export class SendTokenConfirmationDialogComponent {
    private vfsnTokenAddress: string | null = null;
    public isTransfering: boolean = false;
    
    constructor(
        private dialogRef: MatDialogRef<SendTokenConfirmationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { recipientAddress: string, tokenAmount: string, tokenSymbol: string, estimatedGas: string, onResetForm: () => void },
        private web3WalletService: Web3WalletService,
        private existingWalletService: ExistingWalletService,
        private matDialog: MatDialog
    ) {
        this.vfsnTokenAddress = this.web3WalletService.tokenContract?.target as string || '';
    }
    
    closeDialog() {
        this.dialogRef.close();
    }
    
    async confirmSend() {
        if (!this.vfsnTokenAddress || !this.existingWalletService.eip155Provider) {
            this.onOpenResultModal({ isSuccess: false, tokenTransferType: this.data.tokenSymbol as TokenTransferType });
            return;
        }

        try {
            const provider = new BrowserProvider(this.existingWalletService.eip155Provider);
            const signer = await provider.getSigner();
            // Execute the transfer
            this.onOpenResultModal({ isLoading: true, tokenTransferType: this.data.tokenSymbol as TokenTransferType });
            
            let tx;
            if (this.data.tokenSymbol === TokenTransferType.VANA) {
                // For native VANA token, use direct transfer
                const amount = ethers.parseUnits(this.data.tokenAmount, 18);
                tx = await signer.sendTransaction({
                    to: this.data.recipientAddress,
                    value: amount
                });
            } else {
                // For VFSN token, use token contract
                const tokenContractWithSigner = new ethers.Contract(
                    this.vfsnTokenAddress,
                    TokenABI.abi,
                    signer
                );
                const amount = ethers.parseUnits(this.data.tokenAmount, 18);
                tx = await tokenContractWithSigner['transfer'](this.data.recipientAddress, amount);
            }
            // Wait for transaction to be mined
            await tx.wait();
            // Close dialog with success
            this.matDialog.closeAll();
            this.onOpenResultModal({ isSuccess: true, tokenTransferType: this.data.tokenSymbol as TokenTransferType });
        } catch (error) {
            console.error('Error sending tokens:', error);
            this.matDialog.closeAll();
            this.onOpenResultModal({ isSuccess: false, tokenTransferType: this.data.tokenSymbol as TokenTransferType });
        }
    }

    onOpenResultModal({ isLoading, isSuccess, tokenTransferType }: { isLoading?: boolean, isSuccess?: boolean, tokenTransferType: TokenTransferType }) {
        const dialogRef = this.matDialog.open(SendTokenResultModalComponent, {
            width: '100%',
            maxWidth: '800px',
            disableClose: true,
            data: {
                isLoading,
                isSuccess,
                tokenTransferType
            }
        });

        dialogRef.afterClosed().subscribe(() => {
            this.web3WalletService.calculateBalance();
            this.data.onResetForm();
        });
    }
}
