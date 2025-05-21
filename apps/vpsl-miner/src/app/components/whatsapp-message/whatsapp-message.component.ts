import { Component, Input } from '@angular/core';
import { WhatsAppMessage } from '../../services/whatsapp.service';

@Component({
  selector: 'app-whatsapp-message',
  standalone: false,
  templateUrl: './whatsapp-message.component.html',
  styleUrl: './whatsapp-message.component.scss',
})
export class WhatsAppMessageComponent {
  @Input() message: WhatsAppMessage | null = null;

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
