import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WalletType } from '../../models/wallet';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { ExistingWalletService } from '../../services/existing-wallet.service';

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

  constructor() {
    effect(() => {
      const walletAddress = this.electronIpcService.walletAddress();
      const encryptionKey = this.electronIpcService.encryptionKey();
      const walletType = this.electronIpcService.walletType();
      const eip155Provider = this.existingWalletService.eip155Provider();

      if (walletAddress && encryptionKey) {
        this.router.navigate(['app/miner']);
      }
      else if (walletAddress && !encryptionKey && walletType === WalletType.EXISTING_WALLET && eip155Provider) {
        this.router.navigate(['sign-message']);
      }
      else {
        // do nothing
      }
    });
  }

  public createHotWallet() {
    this.router.navigate(['hot-wallet']);
  }

  public connectExternalWallet() {
    this.existingWalletService.connectExistingWallet();
  }

}
