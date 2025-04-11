import { Component, inject, WritableSignal } from '@angular/core';
import { TelegramApiService } from '../../services/telegram-api.service';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';

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

  public isAutoLaunchEnabled: WritableSignal<boolean>;
  public minimizeToTray: WritableSignal<boolean>;

  public get isTelegramAuthorized(): boolean {
    return this.telegramApiService.isAuthorized;
  }

  constructor() {
    this.isAutoLaunchEnabled = this.electronIpcService.isAutoLaunchEnabled;
    this.minimizeToTray = this.electronIpcService.minimizeToTray;
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
}
