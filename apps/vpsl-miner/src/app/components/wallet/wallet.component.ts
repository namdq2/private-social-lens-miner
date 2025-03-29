import { Component, inject, OnInit, signal } from '@angular/core';
import { Web3WalletService } from '../../services/web3-wallet.service';

@Component({
  selector: 'app-wallet',
  standalone: false,
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
})
export class WalletComponent implements OnInit {
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);

  public dlpTokenAmount = signal<number | bigint | string | null>(null);
  public vanaTokenAmount = signal<number | bigint | string | null>(null);
  public walletAddress = signal<string>('');

  public dlpTokenVanaScanUrl = this.web3WalletService.dlpTokenVanaScanUrl;

  public async ngOnInit() {
    this.dlpTokenAmount = this.web3WalletService.dlpTokenAmount;
    this.vanaTokenAmount = this.web3WalletService.vanaTokenAmount;
    this.walletAddress = this.web3WalletService.walletAddress;
    // await this.web3WalletService.calculateBalance();
  }

}
