import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { TelegramApiService } from '../../services/telegram-api.service';

@Component({
  selector: 'app-telegram-signin',
  standalone: false,
  templateUrl: './telegram-signin.component.html',
  styleUrl: './telegram-signin.component.scss',
})
export class TelegramSigninComponent {

  public showConnectTelegramButton = true;

  public phoneNumber = '';
  // public password = '';
  public authCode = '';

  @Output() sendPhoneNumber: EventEmitter<string> = new EventEmitter<string>();
  @Output() sendAuthCode: EventEmitter<string> = new EventEmitter<string>();
  @Output() editNumber: EventEmitter<void> = new EventEmitter<void>();

  @Input() showAuthCodeInput = false;
  @Input() showPhoneNumberError: boolean = false;
  @Input() showCodeError: boolean = false;

  public submitPhoneNumber() {
    this.sendPhoneNumber.emit(this.phoneNumber);
  }

  public submitAuthCode() {
    this.sendAuthCode.emit(this.authCode);
  }

  public editNumberClick() {
    this.editNumber.emit();
  }
}
