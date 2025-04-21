import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { WalletType } from '../../models/wallet';
import { ExistingWalletService } from '../../services/existing-wallet.service';

@Component({
  selector: 'app-wallet',
  standalone: false,
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
})
export class WalletComponent implements OnInit {
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly electronIpcService = inject(ElectronIpcService);
  private readonly existingWalletService = inject(ExistingWalletService);
  private readonly router: Router = inject(Router);

  public dlpTokenAmount = signal<number | bigint | string | null>(null);
  public vanaTokenAmount = signal<number | bigint | string | null>(null);
  public walletAddress = signal<string>('');
  public walletType = signal<WalletType | null>(null);

  public dlpTokenVanaScanUrl = this.web3WalletService.dlpTokenVanaScanUrl;

  constructor() {
    effect(async () => {
      const isConfirmDisconnectWallet = this.electronIpcService.isConfirmDisconnectWallet();
      if (isConfirmDisconnectWallet) {
        this.web3WalletService.disconnectWallet();
        this.existingWalletService.disconnectWallet();
        this.router.navigate(['']);
      }
    });
  }

  public async ngOnInit() {
    this.dlpTokenAmount = this.web3WalletService.dlpTokenAmount;
    this.vanaTokenAmount = this.web3WalletService.vanaTokenAmount;
    this.walletAddress = this.web3WalletService.walletAddress;
    this.walletType = this.electronIpcService.walletType;
    // await this.web3WalletService.calculateBalance();
  }

  async disconnectWallet() {
    if (this.walletType() === WalletType.HOT_WALLET) {
      this.electronIpcService.switchWallet();
    } else {
      await this.electronIpcService.switchWallet();
      this.web3WalletService.disconnectWallet();
      this.existingWalletService.disconnectWallet();
      this.router.navigate(['']);
    }
  }
}
