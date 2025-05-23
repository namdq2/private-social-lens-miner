import { Component, inject, effect } from '@angular/core';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { Router } from '@angular/router';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-sign-message-wallet',
  standalone: false,
  templateUrl: './sign-message-wallet.component.html',
  styleUrl: './sign-message-wallet.component.scss',
})
export class SignMessageWalletComponent {
  private readonly router: Router = inject(Router);
  private readonly existingWalletService: ExistingWalletService = inject(ExistingWalletService);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  private readonly web3WalletService: any = inject(Web3WalletService);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);

  public showHint = false;
  public showError = false;

  public get validNetwork(): boolean {
    return this.existingWalletService.selectedNetworkId() === this.existingWalletService.vanaNetwork.id.toString();
  }

  constructor() {
    effect(async () => {
      const validWalletAddress = this.electronIpcService.walletAddress();
      const validEncryptionKey = this.electronIpcService.encryptionKey();
      if (validWalletAddress && validEncryptionKey) {
        await this.web3WalletService.calculateBalance();
        this.router.navigate(['app/miner']);
      }
      if (!validWalletAddress) {
        this.router.navigate(['']);
      }
    });
  }

  public async signMessage() {
    try {
      if (this.validNetwork) {
        this.showHint = true;
        this.showError = false;
        const walletAddress = this.electronIpcService.walletAddress();
        const signature = await this.existingWalletService.signMessage(walletAddress);
        this.electronIpcService.setEncryptionKey(signature);
      }
      else {
        this.snackBar.open(
          `Switch to the Vana network to continue.`,
          `OK`,
          { duration: 1000 * 3 }
        );
      }

    }
    catch (error) {
      this.showError = true;
      this.showHint = false;
      console.error('Error signing message:', error);
    }
  }

  public async restartConnection() {
    try {
      if (this.existingWalletService.isConnected()) {
        await this.existingWalletService.disconnectWallet();
      }

      this.electronIpcService.setWalletAddress('');
      this.electronIpcService.setEncryptionKey('');
      this.electronIpcService.setWalletType(null);
      this.router.navigate(['']);
    }
    catch (error) {
      console.error('Failed to restart connection');
    }

  }
}
