import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { ElectronIpcService } from '../../services/electron-ipc.service';

@Component({
  selector: 'app-resign-message',
  standalone: false,
  templateUrl: './resign-message.component.html',
  styleUrl: './resign-message.component.scss',
})
export class ResignMessageComponent {
  private readonly router: Router = inject(Router);

  constructor(
    private existingWalletService: ExistingWalletService,
    private electronIpcService: ElectronIpcService
  ) {}

  public async signMessage() {
    const walletAddress = this.electronIpcService.walletAddress();
    const signature = await this.existingWalletService.signMessage(walletAddress);
    if(signature) {
      this.electronIpcService.setEncryptionKey(signature);
      this.router.navigate(['/app/miner']);
    } 
  }
}

