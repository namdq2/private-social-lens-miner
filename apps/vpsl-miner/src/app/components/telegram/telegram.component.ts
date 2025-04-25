import { Component, inject, WritableSignal } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
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

  private phoneNumber = '';
  private authCode = '';

  public get isTelegramAuthorized(): boolean {
    return this.telegramApiService.isAuthorized;
  }

  public showAuthCodeInput = false;
  public showPhoneNumberError: any = null;
  public showCodeError: any = null;

  public uploadFrequencyList = [4, 6, 8, 12, 24];
  public selectedFrequency: WritableSignal<number>;
  public isUploadAllChats: WritableSignal<boolean>;
  public isBackgroundTaskEnabled: WritableSignal<boolean>;

  constructor() {
    this.selectedFrequency = this.electronIpcService.uploadFrequency;
    this.isUploadAllChats = this.electronIpcService.isUploadAllChats;
    this.isBackgroundTaskEnabled = this.electronIpcService.isBackgroundTaskEnabled;
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
      this.showCodeError = false;
    }
    else {
      this.showCodeError = true;
    }
  }

  public onEditNumber() {
    this.showAuthCodeInput = false;
  }

  public selectFrequency(freqItem: number) {
    this.electronIpcService.setUploadFrequency(freqItem);
    this.electronIpcService.updateNextSubmissionTime();
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
