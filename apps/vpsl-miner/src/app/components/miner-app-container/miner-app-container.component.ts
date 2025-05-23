import { Component, inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { MinerSettingsComponent } from '../miner-settings/miner-settings.component';

@Component({
  selector: 'app-miner-app-container',
  standalone: false,
  templateUrl: './miner-app-container.component.html',
  styleUrl: './miner-app-container.component.scss',
})
export class MinerAppContainerComponent implements OnInit {
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);

  public appVersion: string = '';

  constructor() { }

  async ngOnInit() {
    this.appVersion = await this.electronIpcService.getAppVersion();
  }

  public openSettings() {
      const matDialogConfig: MatDialogConfig = {
        disableClose: false,
        height: '550px',
        width: '800px'
      }
      this.dialog.open(
        MinerSettingsComponent,
        matDialogConfig
      );
    }
}
