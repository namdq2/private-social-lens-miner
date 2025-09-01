import { Component, inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { MinerSettingsComponent } from '../miner-settings/miner-settings.component';
import { SubmissionProcessingService } from '../../services/submission-processing.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { StakingApiService } from '../../services/staking-api.service';
import { Router } from '@angular/router';
import { ConfirmDialogV2Component } from '../confirm-dialog-v2/confirm-dialog-v2.component';
import { TelegramApiService } from '../../services/telegram-api.service';
import { AiChatService } from '../../services/ai-chat.service';

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
  private readonly telegramApiService: TelegramApiService = inject(TelegramApiService);
  private readonly aiChatService: AiChatService = inject(AiChatService);
  private requiredStakeAmount: number = 0;
  private requiredBalanceAmount: number = 0;
  public isAiChat: boolean = false;
  public appVersion: string = '';

  constructor() {}

  async ngOnInit() {
    this.appVersion = await this.electronIpcService.getAppVersion();
    // Subscribe to route changes
    this.router.events.subscribe(() => {
      this.updateAiChatState();
    });
  }

  private updateAiChatState() {
    this.isAiChat = this.router.url === '/app/ai-chat';
  }

  public openSettings() {
    const matDialogConfig: MatDialogConfig = {
      disableClose: false,
      height: '550px',
      width: '800px',
    };
    this.dialog.open(MinerSettingsComponent, matDialogConfig);
  }
  // "aiAgentUrl": "https://dfusion-agent.var-meta.com/api/v1",
  public async checkChatPermission() {
    try {
      // check login
      const isTelegramAuthorized = this.telegramApiService.isAuthorized;

      if (!isTelegramAuthorized) {
        this.openLoginNotification();
        return;
      }
      // check user's stake amount and token balance
      this.submissionProcessingService.startProcessingState();
      this.submissionProcessingService.displayInfo('Checking permission');
      const tokenGatingConfig = await this.aiChatService.getTokenGatingConfig();
      if (!tokenGatingConfig) {
        throw new Error('No token gating config found');
      }
      const { stakeThreshold, balanceThreshold } = tokenGatingConfig;
      this.requiredBalanceAmount = balanceThreshold;
      this.requiredStakeAmount = stakeThreshold;
      const allStakes = await this.stakingApiService.getActiveStakes();
      const totalVFSNStake = this.stakingApiService.getTotalVFSNStaked(allStakes);
      const vfsnBalance = Number(this.web3WalletService.dlpTokenAmount());
      this.submissionProcessingService.endProcessingState();

      const isNotAllowed = (totalVFSNStake || 0) < stakeThreshold || (vfsnBalance || 0) < balanceThreshold;

      if (isNotAllowed) {
        this.openTokenGatingDialog();
        return;
      }

      this.router.navigate(['/app/ai-chat']);
      this.isAiChat = true;
    } catch (err) {
      this.submissionProcessingService.displayError('Checking permission failed!');
      if (this.router.url === '/app/ai-chat') {
        this.router.navigate(['/app/miner']);
      }
    }
  }

  public openTokenGatingDialog() {
    this.matDialog
      .open(ConfirmDialogV2Component, {
        data: {
          title: 'Permission Alert',
          message: `You need to own at least ${this.requiredBalanceAmount} VFSN and stake at least ${this.requiredStakeAmount} VFSN to use the Private Lens AI.`,
          confirmText: 'Understand',
          confirmButtonClass: 'dfus-blue-btn',
        },
      })
      .afterClosed()
      .subscribe(() => {
        if (this.router.url === '/app/ai-chat') {
          this.router.navigate(['/app/miner']);
        }
      });
  }

  public openLoginNotification() {
    this.matDialog
      .open(ConfirmDialogV2Component, {
        data: {
          title: 'Login to Private Lens AI',
          message: 'Please login to the Private Lens AI with Telegram to continue.',
          confirmText: 'Login',
          confirmButtonClass: 'dfus-blue-btn',
          icon: 'login',
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          //go to miner path
          this.router.navigate(['/app/miner']);
        }
      });
  }
}
