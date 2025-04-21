import { Component, effect, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { WalletType } from '../../models/wallet';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { Web3WalletService } from '../../services/web3-wallet.service';

@Component({
  selector: 'app-wallet-connection',
  standalone: false,
  templateUrl: './wallet-connection.component.html',
  styleUrl: './wallet-connection.component.scss',
})
export class WalletConnectionComponent {
  private readonly router: Router = inject(Router);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  private readonly existingWalletService: ExistingWalletService = inject(ExistingWalletService);
  private readonly web3WalletService: any = inject(Web3WalletService);

  constructor() {
    effect(async () => {
      const validWalletAddress = this.electronIpcService.walletAddress();
      const validEncryptionKey = this.electronIpcService.encryptionKey();
      if (validWalletAddress && validEncryptionKey) {
        await this.web3WalletService.calculateBalance();
        this.router.navigate(['app/miner']);
      } else {
        this.router.navigate(['']);
      }
    });
  }

  createHotWallet() {
    this.electronIpcService.walletType.set(WalletType.HOT_WALLET);
    this.router.navigate(['hot-wallet']);
  }

  connectExternalWallet() {
    this.electronIpcService.walletType.set(WalletType.EXISTING_WALLET);
    this.existingWalletService.connectWallet();
  }
}
