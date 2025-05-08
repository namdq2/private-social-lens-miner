import { Component, inject, OnInit, signal } from '@angular/core';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { AppConfigService } from '../../services/app-config.service';
@Component({
  selector: 'app-wallet',
  standalone: false,
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
})
export class WalletComponent implements OnInit {
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  public dlpTokenAmount = signal<number | bigint | string | null>(null);
  public vanaTokenAmount = signal<number | bigint | string | null>(null);
  public vanaTestnetExplorerUrl = signal<string>('');
  public dlpTokenVanaScanUrl = this.web3WalletService.dlpTokenVanaScanUrl;

  constructor() {}

  public async ngOnInit() {
    this.dlpTokenAmount = this.web3WalletService.dlpTokenAmount;
    this.vanaTokenAmount = this.web3WalletService.vanaTokenAmount;
    this.vanaTestnetExplorerUrl.set(this.appConfigService.vana?.vanaScanUrl + "/address/" + this.web3WalletService.walletAddress());
    await this.web3WalletService.calculateBalance();  
  }
}
