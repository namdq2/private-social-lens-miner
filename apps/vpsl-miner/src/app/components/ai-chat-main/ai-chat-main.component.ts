import { Component, ElementRef, ViewChild, AfterViewChecked, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AiChatService } from '../../services/ai-chat.service';
import { AiConversation } from '../../models/ai-chat';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-ai-chat-main',
  standalone: false,
  templateUrl: './ai-chat-main.component.html',
  styleUrl: './ai-chat-main.component.scss',
})
export class AiChatMainComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  private readonly aiChatService = inject(AiChatService);
  private readonly dialog = inject(MatDialog);
  
  public newMessage = '';
  public isLoading = false;
  private shouldScrollToBottom = false;

  public readonly conversations = this.aiChatService.conversationsList;
  public readonly activeConversation = this.aiChatService.activeConversation;

  public isSidebarCollapsed = false;

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

  public async onConversationDeleted(conversationId: string): Promise<void> {
    const conversation = this.conversations().find(c => c.id === conversationId);
    if (!conversation) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Conversation',
        message: `Are you sure you want to delete "${conversation.title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmButtonClass: 'dfus-orange-btn',
        icon: 'delete'
      }
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (result) {
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