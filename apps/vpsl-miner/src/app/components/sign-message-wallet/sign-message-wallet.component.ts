import { Component, inject, effect } from '@angular/core';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { Router } from '@angular/router';
import { ElectronIpcService } from '../../services/electron-ipc.service';

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
    const walletAddress = this.electronIpcService.walletAddress();
    const signature = await this.existingWalletService.signMessage(walletAddress);
    this.electronIpcService.setEncryptionKey(signature);
  }
}
