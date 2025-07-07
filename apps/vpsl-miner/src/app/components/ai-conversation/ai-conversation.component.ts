import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AiConversation } from '../../models/ai-chat';

@Component({
  selector: 'app-ai-conversation',
  standalone: false,
  templateUrl: './ai-conversation.component.html',
  styleUrl: './ai-conversation.component.scss',
})
export class AiConversationComponent {
  @Input() conversation!: AiConversation;
  @Input() isSelected: boolean = false;
  
  @Output() conversationSelected = new EventEmitter<string>();
  @Output() conversationDeleted = new EventEmitter<string>();

  public onSelect(): void {
    this.conversationSelected.emit(this.conversation.id);
  }

  public onDelete(event: Event): void {
    event.stopPropagation();
    this.conversationDeleted.emit(this.conversation.id);
  }

  public getLastMessagePreview(): string {
    const lastMessage = this.conversation.messages[this.conversation.messages.length - 1];
    if (!lastMessage) return 'New conversation';
    
    const content = lastMessage.content;
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  }

  public formatDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
} 