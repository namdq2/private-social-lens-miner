import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { WalletType } from '../../models/wallet';
import { ExistingWalletService } from '../../services/existing-wallet.service';

@Component({
  selector: 'app-wallet-button',
  standalone: false,
  templateUrl: './wallet-button.component.html',
  styleUrl: './wallet-button.component.scss',
})
export class WalletButtonComponent implements OnInit {
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly electronIpcService = inject(ElectronIpcService);
  private readonly existingWalletService = inject(ExistingWalletService);
  private readonly router: Router = inject(Router);
  public walletAddress = signal<string>('');
  public walletType = signal<WalletType | null>(null);

  constructor() {
    effect(async () => {
      const isConfirmDisconnectWallet = this.electronIpcService.isConfirmDisconnectWallet();
      if (isConfirmDisconnectWallet) {
        this.disconnectWallet();
      }
    });
  }

  public async ngOnInit() {
    this.walletAddress = this.web3WalletService.walletAddress;
    this.walletType = this.electronIpcService.walletType;
    await this.web3WalletService.calculateBalance();
  }

  async handleDisconnectWallet() {
    try {
      if (this.walletType() === WalletType.HOT_WALLET) {
        await this.electronIpcService.switchWallet();
      } else {
        this.disconnectWallet();
      }
    } catch (error) {
      console.error('Error handle disconnecting wallet:', error);
    }
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
}
