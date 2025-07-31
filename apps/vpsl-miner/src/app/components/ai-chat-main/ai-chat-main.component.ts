import { Component, ElementRef, ViewChild, AfterViewChecked, inject, effect } from '@angular/core';
import { AiChatService } from '../../services/ai-chat.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';
import { TelegramApiService } from '../../services/telegram-api.service';

@Component({
  selector: 'app-ai-chat-main',
  standalone: false,
  templateUrl: './ai-chat-main.component.html',
  styleUrl: './ai-chat-main.component.scss',
})
export class AiChatMainComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private readonly aiChatService = inject(AiChatService);
  private readonly telegramApiService: TelegramApiService = inject(TelegramApiService);
  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly router: Router = inject(Router);
  public newMessageText = '';
  private shouldScrollToBottom = false;

  public readonly conversations = this.aiChatService.conversationsList;
  public readonly messages = this.aiChatService.messagesList;
  public readonly activeConversation = this.aiChatService.activeConversation;
  public readonly isStreaming = this.aiChatService.isStreaming;
  public readonly streamingMessage = this.aiChatService.streamingMessage;
  public readonly streamingFailed = this.aiChatService.streamingFailed;
  public readonly isChatLoading = this.aiChatService.isChatLoading;
  public readonly isCreateConversationLoading = this.aiChatService.isCreateConversationLoading;
  public deletedConversationId = this.aiChatService.deletedConversationId;
  public isSidebarCollapsed = false;

  constructor() {
    // Auto-scroll to bottom when messages change or streaming occurs
    this.aiChatService.loadConversationsFromApi();

    effect(() => {
      const messages = this.messages();
      const isStreaming = this.isStreaming();
      const streamingMessage = this.streamingMessage();
      // Scroll to bottom when messages change or streaming occurs
      if (messages.length > 0 || isStreaming || streamingMessage) {
        setTimeout(() => {
          this.scrollToBottomImmediate(); // Use immediate scrolling for better responsiveness
        }, 50); // Reduced delay for better responsiveness
      }
    });
  }

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
    this.aiChatService.deleteConversation(conversationId);
  }

  public createNewConversation(): void {
    const isTelegramAuthorized = this.telegramApiService.isAuthorized;

    if (!isTelegramAuthorized) {
      this.openLoginNotification();
      return;
    }

    this.aiChatService.createNewConversation();
    this.shouldScrollToBottom = true;
  }

  public async sendMessage(): Promise<void> {
    if (!this.newMessageText.trim() || this.isStreaming()) return;

    const message = this.newMessageText.trim();
    // Force textarea update
    setTimeout(() => {
      this.shouldScrollToBottom = true;
      this.newMessageText = '';
    }, 0);

    try {
      this.aiChatService.sendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  public onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      // event.preventDefault();
      this.sendMessage();
    }
  }

  public getStreamingMessage(): any {
    return {
      id: 'streaming-message',
      content: this.streamingMessage(),
      role: 'assistant',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;

        // Use smooth scrolling for better UX
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth',
        });
      }
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
  }

  private scrollToBottomImmediate(): void {
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

  public openLoginNotification() {
    this.matDialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Login to AI Assistant',
          message: 'Please login to the AI Assistant with Telegram to continue.',
          confirmText: 'Login',
          confirmButtonClass: 'dfus-blue-btn',
          icon: 'login',
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          //go to miner path
          this.router.navigate(['/app/miner']);
        }
      });
  }
}
