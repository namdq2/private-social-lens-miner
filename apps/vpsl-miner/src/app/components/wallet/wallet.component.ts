import { Component, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { WalletType } from '../../models/wallet';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { ConfirmWalletDialogComponent } from '../confirm-wallet-dialog/confirm-wallet-dialog.component';

@Component({
  selector: 'app-wallet',
  standalone: false,
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
})
export class WalletComponent implements OnInit {
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly electronIpcService = inject(ElectronIpcService);
  private readonly router: Router = inject(Router);
  private readonly matDialog: MatDialog = inject(MatDialog);

  public dlpTokenAmount = signal<number | bigint | string | null>(null);
  public vanaTokenAmount = signal<number | bigint | string | null>(null);
  public walletAddress = signal<string>('');
  public walletType = signal<WalletType | null>(null);

  public vanaTestnetExplorerUrl = signal<string>('');
  public dlpTokenVanaScanUrl = this.web3WalletService.dlpTokenVanaScanUrl;

  constructor() { }

  public async ngOnInit() {
    this.dlpTokenAmount = this.web3WalletService.dlpTokenAmount;
    this.vanaTokenAmount = this.web3WalletService.vanaTokenAmount;
    this.walletAddress = this.web3WalletService.walletAddress;
    this.walletType = this.electronIpcService.walletType;
    this.vanaTestnetExplorerUrl.set(`${this.web3WalletService.vanaScanUrl}/address/${this.walletAddress()}`);
    await this.web3WalletService.calculateBalance();
  }

  async handleDisconnectWallet() {
    try {
      if (this.walletType() !== WalletType.EXISTING_WALLET) {
        const dialogRef = this.matDialog.open(ConfirmWalletDialogComponent, {
          data: null,
          disableClose: true,
        });

        dialogRef.afterClosed().subscribe((result: boolean) => {
          if (result) {
            this.disconnectWallet();
          }
        });
      }
      else {
        this.disconnectWallet();
      }
    } catch (error) {
      console.error('Error handle disconnecting wallet:', error);
    }
  }

  async disconnectWallet() {
    try {
      await this.web3WalletService.disconnectWallet();
      this.router.navigate(['']);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }
}
