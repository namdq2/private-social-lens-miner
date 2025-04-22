import { Component, inject, OnInit } from '@angular/core';
import { TelegramApiService } from '../../services/telegram-api.service';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MinerSettingsComponent } from '../miner-settings/miner-settings.component';
import { ElectronIpcService } from '../../services/electron-ipc.service';

@Component({
  selector: 'app-miner-app-container',
  standalone: false,
  templateUrl: './miner-app-container.component.html',
  styleUrl: './miner-app-container.component.scss',
})
export class MinerAppContainerComponent implements OnInit {
  private readonly telegramApiService: TelegramApiService = inject(TelegramApiService);
  private readonly router: Router = inject(Router);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);

  constructor() { }

  async ngOnInit() {
    await this.electronIpcService.getAppVersion();
  }

  get appVersion(): string {
    return this.electronIpcService.appVersion();
  }

  public openSettings() {
      const matDialogConfig: MatDialogConfig = {
        disableClose: false,
        height: '450px',
        width: '700px'
      }
      this.dialog.open(
        MinerSettingsComponent,
        matDialogConfig
      );
    }
}
