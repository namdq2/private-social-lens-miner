import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { IChatStreamParams, IConversation, IConversationsData, IMessage, IMessagesDataRes, ITokenGatingConfig } from '../models/ai-chat';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root',
})
export class AiChatService {
  private readonly conversations = signal<IConversation[]>([]);
  private readonly messages = signal<IMessage[]>([]);
  private readonly activeConversationId = signal<string | null>(null);
  private readonly httpService: HttpService = inject(HttpService);

  // Streaming properties
  public readonly isStreaming = signal<boolean>(false);
  public readonly streamingMessage = signal<string>('');
  public readonly streamingError = signal<any>(null);
  public readonly isConversationLoading = signal<boolean>(false);
  public readonly isMessagesLoading = signal<boolean>(false);
  public readonly isCreateNewLoading = signal<boolean>(false);
  public readonly deletedConversation = signal<string>('');

  public readonly conversationsList = computed(() => this.conversations());
  public readonly messagesList = computed(() => this.messages());
  public readonly shownStreaming = computed(() => this.streamingMessage());
  public readonly activeConversation = computed(() => this.activeConversationId());
  public readonly streamingFailed = computed(() => !!this.streamingError());
  public readonly isChatLoading = computed(() => this.isConversationLoading() || this.isMessagesLoading());
  public readonly isCreateConversationLoading = computed(() => this.isCreateNewLoading());
  public readonly deletedConversationId = computed(() => this.deletedConversation());

  public async loadConversationsFromApi(): Promise<void> {
    try {
      this.isConversationLoading.set(true);
      const response = await firstValueFrom(this.httpService.get<IConversationsData>('conversations'));
      const conversations = response?.data || [];
      this.conversations.set(conversations);

      if (conversations.length === 0) {
        this.messages.set([]);
        this.activeConversationId.set(null);
        return;
      }

      if (!this.isStreaming()) {
        this.selectConversation(conversations[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations from API:', error);
    } finally {
      this.isConversationLoading.set(false);
    }
  }

  public resetAllChatInfo() {
    this.conversations.set([]);
    this.messages.set([]);
    this.activeConversationId.set(null);
    this.isStreaming.set(false);
    this.streamingMessage.set('');
    this.streamingError.set(null);
    this.isConversationLoading.set(false);
    this.isMessagesLoading.set(false);
    this.isCreateNewLoading.set(false);
  }

  public async createNewConversation(): Promise<void> {
    try {
      this.isCreateNewLoading.set(true);
      await firstValueFrom(this.httpService.post<IConversation>('conversations', { title: 'New Chat' }));
      await this.loadConversationsFromApi();
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    } finally {
      this.isCreateNewLoading.set(false);
    }
  }

  public selectConversation(conversationId: string): void {
    if (conversationId === this.activeConversationId()) return;
    this.getMessages(conversationId);
    this.activeConversationId.set(conversationId);
  }

  public async deleteConversation(conversationId: string): Promise<void> {
    try {
      this.deletedConversation.set(conversationId);
      await firstValueFrom(this.httpService.delete(`conversations/${conversationId}`));
      await this.loadConversationsFromApi();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      this.deletedConversation.set('');
    }
  }

  public async getMessages(conversationId: string): Promise<void> {
    try {
      this.isMessagesLoading.set(true);
      this.streamingError.set(null);
      const response = await firstValueFrom(this.httpService.get<IMessagesDataRes>(`conversations/${conversationId}/messages`));
      const messages = response?.data || [];
      this.messages.set(messages.reverse());
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      this.isMessagesLoading.set(false);
    }
  }

  public sendMessage(content: string): void {
    if (!content?.trim()) {
      console.error('Message content cannot be empty');
      return;
    }

    const aiMessageId = this.prepareMessageSending(content);
    const params = this.buildChatParams(content);
    this.streamChatResponse(params, aiMessageId);
  }

  private createMessage(content: string, role: string, id?: string): IMessage {
    const messageId = id || uuidv4();
    const now = new Date().toISOString();

    return {
      id: messageId,
      content,
      role,
      createdAt: now,
      updatedAt: now,
    };
  }

  private buildChatParams(content: string): IChatStreamParams {
    return {
      content,
      conversationId: this.activeConversationId() || '',
    };
  }

  private streamChatResponse(params: IChatStreamParams, aiMessageId: string): void {
    this.streamingError.set(null);
    this.httpService
      .stream<any>(
        'conversations/chat/stream',
        params,
        (chunk) => this.handleStreamingChunk(chunk),
        (finalMessage) => this.handleStreamingComplete(finalMessage, aiMessageId),
        (error) => this.handleStreamingError(error, aiMessageId),
      )
      .subscribe({
        error: (error) => {
          this.handleStreamingError(error, aiMessageId);
        },
      });
  }

  private handleStreamingChunk(chunk: string): void {
    if (!chunk?.trim()) return;
    this.streamingMessage.update((current) => {
      const newContent = current + chunk;
      return newContent;
    });
  }

  private handleStreamingComplete(finalMessage: any, aiMessageId: string): void {
    // Update the actual messages array with the complete content
    this.messages.update((messages) => [...messages, finalMessage]);

    // Update message metadata if available
    if (finalMessage.id || finalMessage.createdAt || finalMessage.updatedAt) {
      this.updateAIMessageMetadata(aiMessageId, finalMessage);
    }

    // Clear streaming state after updating messages
    this.clearStreamingState();
  }

  private prepareMessageSending(content: string): string {
    // Add user message
    const userMessage = this.createMessage(content, 'user');
    this.messages.update((messages) => [...messages, userMessage]);

    // Add AI message placeholder
    const aiMessageId = uuidv4();

    // Initialize streaming state
    this.isStreaming.set(true);
    this.streamingMessage.set('');

    return aiMessageId;
  }

  private handleStreamingError(error: any, aiMessageId: string): void {
    console.error('🚀 ~ AiChatService ~ handleStreamingError ~ error:', error);
    this.streamingError.set(error);
    this.removeAIMessage(aiMessageId);
    this.clearStreamingState();
  }

  private updateAIMessageMetadata(aiMessageId: string, finalMessage: any): void {
    this.messages.update((messages) => {
      const updatedMessages = [...messages];
      const aiMessageIndex = updatedMessages.findIndex((msg) => msg.id === aiMessageId);

      if (aiMessageIndex !== -1) {
        updatedMessages[aiMessageIndex] = {
          ...updatedMessages[aiMessageIndex],
          id: finalMessage.id || aiMessageId,
          createdAt: finalMessage.createdAt || new Date().toISOString(),
          updatedAt: finalMessage.updatedAt || new Date().toISOString(),
        };
      }

      return updatedMessages;
    });
  }

  private removeAIMessage(aiMessageId: string): void {
    this.messages.update((messages) => messages.filter((msg) => msg.id !== aiMessageId));
  }

  private clearStreamingState(): void {
    this.isStreaming.set(false);
    this.streamingMessage.set('');
  }

  public async getTokenGatingConfig() {
    const response = await firstValueFrom(this.httpService.get<ITokenGatingConfig>('token-gating-configs/latest'));
    
    return {
      stakeThreshold: Number(response.stakeThreshold || 0),
      balanceThreshold: Number(response.balanceThreshold || 0)
    };
  }
}
