import { Component, Input } from '@angular/core';
import { IMessage } from '../../models/ai-chat';

@Component({
  selector: 'app-ai-message',
  standalone: false,
  templateUrl: './ai-message.component.html',
  styleUrl: './ai-message.component.scss',
})
export class AiMessageComponent {
  @Input() message!: IMessage;
  @Input() isStreaming: boolean = false;

  public formatTime(date: Date | string): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok',
    });
  }

  public formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Bangkok',
    });
  }
}
