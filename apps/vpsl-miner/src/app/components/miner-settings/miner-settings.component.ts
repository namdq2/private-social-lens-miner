import { Component, inject, WritableSignal } from '@angular/core';
import { TelegramApiService } from '../../services/telegram-api.service';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { isElectron } from '../../shared/helpers';

declare const window: any;

@Component({
  selector: 'app-miner-settings',
  standalone: false,
  templateUrl: './miner-settings.component.html',
  styleUrl: './miner-settings.component.scss',
})
export class MinerSettingsComponent {
  private readonly telegramApiService: TelegramApiService = inject(TelegramApiService);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);

  public readonly isAutoLaunchEnabled: WritableSignal<boolean> = this.electronIpcService.isAutoLaunchEnabled;
  public readonly minimizeToTray: WritableSignal<boolean> = this.electronIpcService.minimizeToTray;
  public readonly checkForUpdate: WritableSignal<boolean> = this.electronIpcService.checkForUpdate;

  private readonly defaultUpdateDescription: string = 'Check for updates';
  public checkUpdateDescription: string = this.defaultUpdateDescription;

  public get isTelegramAuthorized(): boolean {
    return this.telegramApiService.isAuthorized;
  }

  constructor() {
    // Listen for messages from the main process
    if (isElectron()) {
      window.electron.onSendUpdateMessage(async (event: any, message: any) => {
        console.warn('Received message from main process:', message);

        if (message === 'NO_NEW_UPDATE') {
          this.snackBar.open(
            `Your dFusion DLP Miner is running the newest version.`,
            `OK`,
            { duration: 1000 * 5 }
          );
        }

        const checkForUpdate = await window.electron.getCheckForUpdate();
        this.checkForUpdate.set(checkForUpdate);
        this.checkUpdateDescription = this.checkForUpdate() ? message : this.defaultUpdateDescription;
      });
    }
  }

  public onAutoLaunchEnabledChange(matSlideToggleChange: MatSlideToggleChange) {
    this.electronIpcService.enableAutoLaunch(matSlideToggleChange.checked);
  }

  public onMinimizeToTrayChange(matSlideToggleChange: MatSlideToggleChange) {
    this.electronIpcService.setMinimizeToTray(matSlideToggleChange.checked);
  }

  public async signOut() {
    if (this.isTelegramAuthorized) {
      await this.telegramApiService.logOut().then(() => {
        this.electronIpcService.stopBackgroundTask();
        this.snackBar.open(
          `You've successfully signed out.`,
          ``,
          { duration: 1000 * 3 }
        );
      }).catch(() => {
        this.snackBar.open(
          `Failed to sign out of Telegram. Try again.`,
          `Close`,
          { duration: 1000 * 5 }
        );
      });
    }
  }

  public doCheckForUpdate() {
    this.electronIpcService.setCheckForUpdate(true);
  }
}
