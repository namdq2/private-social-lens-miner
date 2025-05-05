import { Component, inject } from '@angular/core';
import { TelegramApiService } from '../../services/telegram-api.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MinerSettingsComponent } from '../miner-settings/miner-settings.component';
@Component({
  selector: 'app-miner-app-container',
  standalone: false,
  templateUrl: './miner-app-container.component.html',
  styleUrl: './miner-app-container.component.scss',
})
export class MinerAppContainerComponent {
  private readonly telegramApiService: TelegramApiService = inject(TelegramApiService);
  private readonly dialog: MatDialog = inject(MatDialog);

  constructor() {}

  public openSettings() {
    const matDialogConfig: MatDialogConfig = {
      disableClose: false,
      height: '450px',
      width: '700px',
    };
    this.dialog.open(MinerSettingsComponent, matDialogConfig);
  }
}
