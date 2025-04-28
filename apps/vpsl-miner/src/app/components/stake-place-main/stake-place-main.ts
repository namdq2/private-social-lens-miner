import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { StakeModalComponent } from '../stake-modal/stake-modal.component';
import { Web3WalletService } from '../../services/web3-wallet.service';

@Component({
  selector: 'app-stake-place-main',
  standalone: false,
  templateUrl: './stake-place-main.html',
  styleUrl: './stake-place-main.scss',
})

export class StakePlaceMainComponent {
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly router: Router = inject(Router);
  public dlpTokenAmount = signal<string>('');
  public vanaTokenAmount = signal<string>('');
  public walletAddress = signal<string>('');

  constructor() {
    this.dlpTokenAmount.set(Number(this.web3WalletService.dlpTokenAmount() || 0).toFixed(5));
    this.vanaTokenAmount.set(Number(this.web3WalletService.vanaTokenAmount() || 0).toFixed(5));
    this.walletAddress = this.web3WalletService.walletAddress;
  }

  openDialog(): void {
    this.matDialog.open(StakeModalComponent, {
      panelClass: 'custom-dialog-container',
      data: {
        /* data */
      },
    });
  }

  onViewStakeRecords() {
    this.router.navigate([], { queryParams: { viewStakeRecords: 'true' } });
  }
}
