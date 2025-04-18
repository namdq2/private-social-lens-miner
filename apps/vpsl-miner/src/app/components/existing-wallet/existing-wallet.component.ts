import { Component, effect, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { ExistingWalletService } from '../../services/existing-wallet.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-existing-wallet',
  standalone: false,
  templateUrl: './existing-wallet.component.html',
  styleUrl: './existing-wallet.component.scss',
})
export class ExistingWalletComponent implements OnInit {
  private readonly router: Router = inject(Router);
  private readonly location: Location = inject(Location);
  public readonly existingWalletService = inject(ExistingWalletService);
  private readonly electronIpcService = inject(ElectronIpcService);
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);

  public isConnected = false;

  constructor() {
    // check if wallet address and encryption key are valid
    effect(() => {
      const validWalletAddress = this.electronIpcService.walletAddress();
      const validEncryptionKey = this.electronIpcService.encryptionKey();

      if (validWalletAddress && validEncryptionKey) {
        this.router.navigate(['app/miner']);
      }
    });

    // check connection status
    effect(() => {
      this.isConnected = this.existingWalletService.isConnected();
      if (this.isConnected) {
        this.isConnected = true;
      } else {
        this.isConnected = false;
      }
    });
  }

  public async ngOnInit() {
    this.connectWallet();
  }

  public async connectWallet() {
    this.existingWalletService.connectWallet();
  }

  public goBack() {
    this.location.back();
  }

  public async signMessage(): Promise<void> {
    try {
      const signature = await this.existingWalletService.signMessage();
      const walletAddress = this.existingWalletService.walletAddress();
      if (signature && walletAddress) {
        this.electronIpcService.setWalletAddress(walletAddress);
        this.electronIpcService.setEncryptionKey(signature);
        await this.web3WalletService.calculateBalance();
        this.router.navigate(['app/miner']);
      } else {
        window.alert('Could not sign message or wallet address is missing.');
        console.error('Could not sign message or wallet address is missing.');
      }
    } catch (error) {
      console.error('Failed to sign message:', error);
      window.alert('Please try sign message again.');
      this.router.navigate(['app/miner']);
    }
  }
}
