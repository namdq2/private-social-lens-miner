import { AfterViewInit, Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Api } from 'telegram';
import { TotalList } from 'telegram/Helpers';
import { Dialog } from 'telegram/tl/custom/dialog';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { TelegramApiService } from '../../services/telegram-api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { SubmissionProcessingService } from '../../services/submission-processing.service';
import { SuiPocService } from '../../services/sui-poc.service';
import { SuiPrivateKeyDialogComponent } from '../sui-private-key-dialog/sui-private-key-dialog.component';

@Component({
  selector: 'app-telegram-main',
  standalone: false,
  templateUrl: './telegram-main.component.html',
  styleUrl: './telegram-main.component.scss',
})
export class TelegramMainComponent implements AfterViewInit {
  private readonly telegramApiService: TelegramApiService = inject(TelegramApiService);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  private readonly submissionProcessingService: SubmissionProcessingService = inject(SubmissionProcessingService);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly suiPocService: SuiPocService = inject(SuiPocService);

  public isBackgroundTaskEnabled: WritableSignal<boolean>;
  public lastSubmissionTime: WritableSignal<Date | null>;
  public nextSubmissionTime: WritableSignal<Date | null>;

  public telegramDialogList: WritableSignal<TotalList<Dialog>> = this.telegramApiService.telegramDialogs;
  public selectedDialog: Dialog | null = null;
  public selectedDialogMessages: TotalList<Api.Message> = [];

  public selectedDialogsList: WritableSignal<Array<Dialog>> = this.telegramApiService.selectedDialogsList;

  public readonly isAllChatsSelected = computed(() => {
    const selectedList = this.selectedDialogsList();
    const totalList = this.telegramDialogList();
    return selectedList.length === totalList.length;
  });

  public readonly lastSubmissionTimeString = computed(() => {
    const lastSubmissionTime = this.lastSubmissionTime();
    if (lastSubmissionTime) {
      const lastSubmissionDate = new Date(lastSubmissionTime);
      return `${lastSubmissionDate.toLocaleDateString()}, ${lastSubmissionDate.toLocaleTimeString()}`;
    } else {
      return '';
    }
  });

  public readonly nextSubmissionTimeString = computed(() => {
    const nextSubmissionTime = this.nextSubmissionTime();
    if (nextSubmissionTime) {
      const nextSubmissionDate = new Date(nextSubmissionTime);
      return `${nextSubmissionDate.toLocaleDateString()}, ${nextSubmissionDate.toLocaleTimeString()}`;
    } else {
      return '';
    }
  });

  constructor() {
    this.isBackgroundTaskEnabled = this.electronIpcService.isBackgroundTaskEnabled;
    this.lastSubmissionTime = this.electronIpcService.lastSubmissionTime;
    this.nextSubmissionTime = this.electronIpcService.nextSubmissionTime;
  }

  public ngAfterViewInit(): void {
    if (this.isBackgroundTaskEnabled() && !this.electronIpcService.backgroundTaskIntervalExists()) {
      this.electronIpcService.startBackgroundTask();
    }
  }

  public async refresh() {
    this.telegramApiService.initialisePreSelectedDialogs();
  }

  public async onDialogSelected(dialog: Dialog | null) {
    console.log('onDialogSelected', dialog);
    this.selectedDialog = dialog;
    const messages = await this.telegramApiService.getMessages(Number(dialog?.id));
    if (messages) {
      this.selectedDialogMessages = messages;
    }
  }

  public selectAllDialogs(matCheckboxChange: MatCheckboxChange) {
    if (matCheckboxChange.checked) {
      const fullDialogList = [...this.telegramDialogList()];
      this.selectedDialogsList.set(fullDialogList);
    } else {
      this.selectedDialogsList.set([]);
    }
  }

  public onAddDialog(dialog: Dialog | null) {
    if (dialog) {
      const existingDialog = this.selectedDialogsList().find((telegramDialog) => telegramDialog.id === dialog.id);
      if (!existingDialog) {
        this.selectedDialogsList().push(dialog);
      } else {
        console.error('DIALOG ALREADY IN LIST');
      }
    } else {
      console.error('NULL DIALOG!');
    }
  }

  public onRemoveDialog(dialog: Dialog | null) {
    const dialogIndex = this.selectedDialogsList().findIndex((telegramDialog) => telegramDialog.id === dialog?.id);
    if (dialogIndex !== -1) {
      this.selectedDialogsList().splice(dialogIndex, 1);
    }
  }

  public async doSubmit() {
    // await this.telegramApiService.initiateSubmission();
    // this.startBackgroundTask();
    // this.submissionProcessingService.resetState();
    // this.submissionProcessingService.startProcessingState();
    // this.telegramApiService.doTelegramSubmission('123');
    const suiPrivateKey = this.suiPocService.getSuiPrivateKey();
    if (suiPrivateKey) {
      this.submissionProcessingService.startProcessingState();
      this.suiPocService.doSuiPoc();
      return;
    }

    this.openSuiKeyImport();
  }

  public startBackgroundTask() {
    if (this.telegramApiService.selectedDialogsList().length > 0 || this.electronIpcService.isUploadAllChats()) {
      this.electronIpcService.startBackgroundTask();
    } else {
      this.snackBar.open(`Select at least one chat`, `OK`, { duration: 1000 * 2 });
    }
  }

  public stopBackgroundTask() {
    const dialogRef = this.matDialog.open(ConfirmDialogComponent, {
      data: null,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.electronIpcService.stopBackgroundTask();
      }
    });
  }

  public openSuiKeyImport() {
    this.matDialog.open(SuiPrivateKeyDialogComponent, {
      disableClose: true,
      width: '600px'
    });
  }
}
