import { Component, Input } from '@angular/core';
import { Api } from 'telegram';

@Component({
  selector: 'app-telegram-message',
  standalone: false,
  templateUrl: './telegram-message.component.html',
  styleUrl: './telegram-message.component.scss',
})
export class TelegramMessageComponent {
  @Input() message: Api.Message | null = null;

  public formatDate(dateNumber: number | undefined) {
    if (dateNumber) {
      return new Date(dateNumber * 1000).toDateString();
    }
    return 'Invalid date';

  }

  public formatTime(dateNumber: number | undefined) {
    if (dateNumber) {
      return new Date(dateNumber * 1000).toLocaleTimeString();
    }
    return 'Invalid time';

  }
}
