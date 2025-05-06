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

  public vanaTestnetExplorerUrl = signal<string>('');
  public dlpTokenVanaScanUrl = this.web3WalletService.dlpTokenVanaScanUrl;

  constructor() {}

  public async ngOnInit() {
    this.dlpTokenAmount = this.web3WalletService.dlpTokenAmount;
    this.vanaTokenAmount = this.web3WalletService.vanaTokenAmount;
    await this.web3WalletService.calculateBalance();
  }
}
