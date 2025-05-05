import { Component, inject } from '@angular/core';
import { WalletType } from '../../models/wallet';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { ExistingWalletService } from '../../services/existing-wallet.service';

@Component({
  selector: 'app-reconnect-instruction-dialog',
  standalone: false,
  templateUrl: './reconnect-instruction-dialog.component.html',
  styleUrl: './reconnect-instruction-dialog.component.scss',
})
export class ReconnectInstructionDialogComponent {
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  private readonly existingWalletService: ExistingWalletService = inject(ExistingWalletService);

  constructor() {}

  connectExternalWallet() {
    this.electronIpcService.setWalletType(WalletType.EXISTING_WALLET);
    this.existingWalletService.connectWallet(WalletType.EXISTING_WALLET, true);
  }
}
