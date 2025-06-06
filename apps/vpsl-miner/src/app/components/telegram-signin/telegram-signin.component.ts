import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-telegram-signin',
  standalone: false,
  templateUrl: './telegram-signin.component.html',
  styleUrl: './telegram-signin.component.scss',
})
export class TelegramSigninComponent {

  public showConnectTelegramButton = true;

  public phoneNumber = '';
  public authCode = '';

  @Output() sendPhoneNumber: EventEmitter<string> = new EventEmitter<string>();
  @Output() sendAuthCode: EventEmitter<string> = new EventEmitter<string>();

  @Input() showAuthCodeInput = false;
  @Input() showPhoneNumberError: boolean = false;
  @Input() showCodeError: boolean = false;
  @Input() showTelegramError: boolean = false;

  public submitPhoneNumber() {
    if (this.phoneNumber.trim() === '') {
      this.showPhoneNumberError = true;
    }
    else {
      this.sendPhoneNumber.emit(this.phoneNumber);
    }
  }

  public submitAuthCode() {
    if (this.authCode.trim() === '') {
      this.showCodeError = true;
    }
    else {
      this.sendAuthCode.emit(this.authCode);
    }
  }

  public editNumberClick() {
    this.showAuthCodeInput = false;
  }
}
