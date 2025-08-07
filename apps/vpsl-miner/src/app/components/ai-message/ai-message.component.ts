import { Component, Input } from '@angular/core';
import { IMessage } from '../../models/ai-chat';
import {formatTime, formatDate} from '../../shared/helpers'

@Component({
  selector: 'app-ai-message',
  standalone: false,
  templateUrl: './ai-message.component.html',
  styleUrl: './ai-message.component.scss',
})
export class AiMessageComponent {
  @Input() message!: IMessage;
  @Input() isStreaming: boolean = false;

  public formatDayTime(date: Date | string): string {
    return `${formatDate(date)} at ${formatTime(date)}`;
  }
}
