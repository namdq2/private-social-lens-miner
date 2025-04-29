import { Component, effect, inject } from '@angular/core';
import { TelegramApiService } from '../../services/telegram-api.service';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MinerSettingsComponent } from '../miner-settings/miner-settings.component';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { WalletType } from '../../models/wallet';
@Component({
  selector: 'app-miner-app-container',
  standalone: false,
  templateUrl: './miner-app-container.component.html',
  styleUrl: './miner-app-container.component.scss',
})
export class MinerAppContainerComponent {
  private readonly telegramApiService: TelegramApiService = inject(TelegramApiService);
  private readonly router: Router = inject(Router);
  private readonly dialog: MatDialog = inject(MatDialog);

  constructor(
    private readonly existingWalletService: ExistingWalletService,
    private readonly web3WalletService: Web3WalletService,
    private readonly electronIpcService: ElectronIpcService,
  ) {
    effect(() => {
      if (
        (!this.existingWalletService.eip155Provider && this.electronIpcService.walletType() === WalletType.EXISTING_WALLET) ||
        (!this.web3WalletService.wallet && this.electronIpcService.walletType() === WalletType.HOT_WALLET)
      ) {
        this.disconnectWallet();
      }
    });
  }

  async disconnectWallet() {
    try {
      await this.existingWalletService.disconnectWallet();
      this.web3WalletService.disconnectWallet();
      this.electronIpcService.disconnectWallet();
      this.router.navigate(['']);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }
  public openSettings() {
    const matDialogConfig: MatDialogConfig = {
      disableClose: false,
      height: '450px',
      width: '700px',
    };
    this.dialog.open(MinerSettingsComponent, matDialogConfig);
  }

  public onViewStakeRecords() {
    this.router.navigate(['/app/stake-place'], { queryParams: { viewStakeRecords: 'true' } });
  }
}
