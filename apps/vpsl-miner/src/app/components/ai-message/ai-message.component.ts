import { Component, Input } from '@angular/core';
import { AiMessage } from '../../models/ai-chat';

@Component({
  selector: 'app-ai-message',
  standalone: false,
  templateUrl: './ai-message.component.html',
  styleUrl: './ai-message.component.scss',
})
export class AiMessageComponent {
  @Input() message!: AiMessage;

  public formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  public formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
} 