import { Component, inject, WritableSignal } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
// import { MatSnackBar } from '@angular/material/snack-bar';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { TelegramApiService } from '../../services/telegram-api.service';

@Component({
  selector: 'app-telegram',
  standalone: false,
  templateUrl: './telegram.component.html',
  styleUrl: './telegram.component.scss',
})
export class TelegramComponent {
  private readonly telegramApiService: TelegramApiService = inject(TelegramApiService);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  // private readonly snackBar: MatSnackBar = inject(MatSnackBar);

  private phoneNumber = '';
  private authCode = '';

  public get isTelegramAuthorized(): boolean {
    return this.telegramApiService.isAuthorized;
  }

  public showAuthCodeInput = false;
  public showPhoneNumberError: any = null;
  public showCodeError: any = null;

  public selectedFrequency: WritableSignal<number>;
  public uploadFrequencyList: WritableSignal<Array<number>>;
  public isUploadAllChats: WritableSignal<boolean>;
  public isBackgroundTaskEnabled: WritableSignal<boolean>;
  // public lastSubmissionTime: WritableSignal<Date | null>;
  // public nextSubmissionTime: WritableSignal<Date | null>;

  // public get lastSubmissionTimeString(): string {
  //   if (this.lastSubmissionTime()) {
  //     const lastSubmissionDate = new Date(this.lastSubmissionTime()!);
  //     return lastSubmissionDate.toLocaleTimeString();
  //   }
  //   else {
  //     return '';
  //   }
  // }

  // public get nextSubmissionTimeString(): string {
  //   if (this.nextSubmissionTime()) {
  //     const nextSubmissionDate = new Date(this.nextSubmissionTime()!);
  //     return nextSubmissionDate.toLocaleTimeString();
  //   }
  //   else {
  //     return '';
  //   }
  // }

  constructor() {
    this.uploadFrequencyList = this.electronIpcService.uploadFrequencyList;
    this.selectedFrequency = this.electronIpcService.uploadFrequency;
    this.isUploadAllChats = this.electronIpcService.isUploadAllChats;
    this.isBackgroundTaskEnabled = this.electronIpcService.isBackgroundTaskEnabled;
    // this.lastSubmissionTime = this.electronIpcService.lastSubmissionTime;
    // this.nextSubmissionTime = this.electronIpcService.nextSubmissionTime;
  }

  // public ngAfterViewInit(): void {
  //   this.telegramApiService.getCountryCodes();
  // }

  public async getAuthCode(phoneNumber: string) {
    if (phoneNumber.trim() === '') {
      this.showPhoneNumberError = true;
      return;
    }

    this.phoneNumber = phoneNumber;
    const result = await this.telegramApiService.sendCodeHandler(this.phoneNumber);
    if (result) {
      this.showAuthCodeInput = true;
      this.showPhoneNumberError = false;
    }
    else {
      console.log('getAuthCode failed:', result);
      this.showPhoneNumberError = true;
    }
  }

  public async submitAuthCode(authCode: string) {
    if (authCode.trim() === '') {
      this.showCodeError = true;
      return;
    }

    this.authCode = authCode;
    const loginSuccess: boolean = await this.telegramApiService.clientStartHandler(this.phoneNumber, this.authCode);
    if (loginSuccess) {
      console.log('Login success');
      await this.telegramApiService.getDialogs();
      this.telegramApiService.initialisePreSelectedDialogs();
      this.showAuthCodeInput = false;
      this.showCodeError = false;
    }
    else {
      this.showCodeError = true;
    }
  }

  public onEditNumber() {
    this.showAuthCodeInput = false;
  }

  // public startBackgroundTask() {
  //   if (this.telegramApiService.selectedDialogsList().length > 0) {
  //     this.electronIpcService.startBackgroundTask();
  //   }
  //   else {
  //     this.snackBar.open(
  //       `Select at least one chat`,
  //       `OK`,
  //       { duration: 1000 * 2 }
  //     );
  //   }
  // }

  // public stopBackgroundTask() {
  //   this.electronIpcService.stopBackgroundTask();
  // }

  public selectFrequency(freqItem: number) {
    this.selectedFrequency.set(freqItem);
  }

  public onUploadAllChatsChange(matSlideToggleChange: MatSlideToggleChange) {
    this.electronIpcService.setUploadAllChats(matSlideToggleChange.checked);
    if (matSlideToggleChange.checked) {
      const fullDialogList = [...this.telegramApiService.telegramDialogs()];
      this.telegramApiService.selectedDialogsList.set(fullDialogList);
    }
    // else {
    //   this.telegramApiService.selectedDialogsList.set([]);
    // }
  }
}
