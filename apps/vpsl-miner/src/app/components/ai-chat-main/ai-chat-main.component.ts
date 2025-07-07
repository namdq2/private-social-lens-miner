import { Component, ElementRef, ViewChild, AfterViewChecked, inject } from '@angular/core';
import { AiChatService } from '../../services/ai-chat.service';
import { AiConversation } from '../../models/ai-chat';

@Component({
  selector: 'app-ai-chat-main',
  standalone: false,
  templateUrl: './ai-chat-main.component.html',
  styleUrl: './ai-chat-main.component.scss',
})
export class AiChatMainComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  private readonly aiChatService = inject(AiChatService);
  
  public newMessage = '';
  public isLoading = false;
  private shouldScrollToBottom = false;

  public readonly conversations = this.aiChatService.conversationsList;
  public readonly activeConversation = this.aiChatService.activeConversation;

  public ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  public onConversationSelected(conversationId: string): void {
    this.aiChatService.selectConversation(conversationId);
    this.shouldScrollToBottom = true;
  }

  public onConversationDeleted(conversationId: string): void {
    if (confirm('Are you sure you want to delete this conversation?')) {
      this.aiChatService.deleteConversation(conversationId);
    }
  }

  public createNewConversation(): void {
    this.aiChatService.createNewConversation();
    this.shouldScrollToBottom = true;
  }

  public async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || this.isLoading) return;

    const message = this.newMessage.trim();
    this.newMessage = '';
    this.isLoading = true;
    this.shouldScrollToBottom = true;

    try {
      await this.aiChatService.sendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      this.isLoading = false;
      this.shouldScrollToBottom = true;
    }
  }

  public onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
  }

  public getWelcomeMessage(): string {
    return "Hello! I'm your AI assistant. I'm here to help you with questions about the dFusion DLP miner, blockchain technology, and anything else you'd like to know. How can I assist you today?";
  }
} 