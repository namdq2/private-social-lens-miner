import { Component, inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { MinerSettingsComponent } from '../miner-settings/miner-settings.component';
import { SubmissionProcessingService } from '../../services/submission-processing.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { StakingApiService } from '../../services/staking-api.service';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-miner-app-container',
  standalone: false,
  templateUrl: './miner-app-container.component.html',
  styleUrl: './miner-app-container.component.scss',
})
export class MinerAppContainerComponent implements OnInit {
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  private readonly submissionProcessingService: SubmissionProcessingService = inject(SubmissionProcessingService);
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly stakingApiService: StakingApiService = inject(StakingApiService);
  private readonly router: Router = inject(Router);
  private readonly matDialog: MatDialog = inject(MatDialog);

  public appVersion: string = '';

  constructor() {}

  async ngOnInit() {
    this.appVersion = await this.electronIpcService.getAppVersion();
  }

  public openSettings() {
    const matDialogConfig: MatDialogConfig = {
      disableClose: false,
      height: '550px',
      width: '800px',
    };
    this.dialog.open(MinerSettingsComponent, matDialogConfig);
  }

  public async checkChatPermission() {
    try {
      this.submissionProcessingService.startProcessingState();
      this.submissionProcessingService.displayInfo('Checking permission');
      const allStakes = await this.stakingApiService.getActiveStakes();
      const totalVFSNStake = this.stakingApiService.getTotalVFSNStaked(allStakes);
      const vfsnBalance = Number(this.web3WalletService.dlpTokenAmount());
      this.submissionProcessingService.endProcessingState();

      const isNotAllowed = (totalVFSNStake || 0) <= 0 || (vfsnBalance || 0) <= 0 || true;

      if (isNotAllowed) {
        this.openTokenGatingDialog();
        return;
      }

      this.router.navigate(['/app/ai-chat']);
    } catch (err) {
      this.submissionProcessingService.displayError('Checking permission failed!');
      this.router.navigate(['/app/miner']);
    }
  }

  public openTokenGatingDialog() {
    this.matDialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Permission Alert',
        message: 'You need to own and stake VFSN to use the AI Assistant.',
        confirmText: 'Understand',
        confirmButtonClass: 'dfus-blue-btn',
      },
    });
  }
}
