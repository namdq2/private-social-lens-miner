import { Injectable, computed, signal } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { AiMessage, AiConversation, AiChatRequest, AiChatResponse } from '../models/ai-chat';
import { ElectronIpcService } from './electron-ipc.service';

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private readonly conversations = signal<AiConversation[]>([]);
  private readonly activeConversationId = signal<string | null>(null);

  public readonly conversationsList = computed(() => this.conversations());
  public readonly activeConversation = computed(() => {
    const activeId = this.activeConversationId();
    return activeId ? this.conversations().find(c => c.id === activeId) || null : null;
  });

  private readonly storageKey = 'ai-chat-conversations';

  constructor(private electronIpcService: ElectronIpcService) {
    this.loadConversations();
  }

  public createNewConversation(): AiConversation {
    const conversation: AiConversation = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.conversations.update(convs => [conversation, ...convs]);
    this.activeConversationId.set(conversation.id);
    this.saveConversations();
    
    return conversation;
  }

  public selectConversation(conversationId: string): void {
    this.activeConversationId.set(conversationId);
  }

  public deleteConversation(conversationId: string): void {
    this.conversations.update(convs => convs.filter(c => c.id !== conversationId));
    
    if (this.activeConversationId() === conversationId) {
      const remaining = this.conversations();
      this.activeConversationId.set(remaining.length > 0 ? remaining[0].id : null);
    }
    
    this.saveConversations();
  }

  public async sendMessage(content: string): Promise<void> {
    let conversation = this.activeConversation();
    
    if (!conversation) {
      conversation = this.createNewConversation();
    }

    // Add user message
    const userMessage: AiMessage = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: new Date()
    };

    this.addMessageToConversation(conversation.id, userMessage);

    // Update conversation title if it's the first message
    if (conversation.messages.length === 1) {
      const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
      this.updateConversationTitle(conversation.id, title);
    }

    // Add assistant message placeholder
    const assistantMessage: AiMessage = {
      id: uuidv4(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true
    };

    this.addMessageToConversation(conversation.id, assistantMessage);

    try {
      // Call AI API
      const response = await this.callAiApi(conversation.messages.filter(m => !m.isStreaming));
      
      // Update assistant message with response
      this.updateMessage(conversation.id, assistantMessage.id, {
        content: response.content,
        isStreaming: false
      });
      
    } catch (error) {
      // Update with error message
      this.updateMessage(conversation.id, assistantMessage.id, {
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        isStreaming: false
      });
      console.error('AI API Error:', error);
    }
  }

  private addMessageToConversation(conversationId: string, message: AiMessage): void {
    this.conversations.update(convs => 
      convs.map(conv => 
        conv.id === conversationId 
          ? { ...conv, messages: [...conv.messages, message], updatedAt: new Date() }
          : conv
      )
    );
    this.saveConversations();
  }

  private updateMessage(conversationId: string, messageId: string, updates: Partial<AiMessage>): void {
    this.conversations.update(convs => 
      convs.map(conv => 
        conv.id === conversationId 
          ? {
              ...conv,
              messages: conv.messages.map(msg => 
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
              updatedAt: new Date()
            }
          : conv
      )
    );
    this.saveConversations();
  }

  private updateConversationTitle(conversationId: string, title: string): void {
    this.conversations.update(convs => 
      convs.map(conv => 
        conv.id === conversationId 
          ? { ...conv, title, updatedAt: new Date() }
          : conv
      )
    );
    this.saveConversations();
  }

  private async callAiApi(messages: AiMessage[]): Promise<AiChatResponse> {
    // For demo purposes, return a mock response
    // In production, you would call an actual AI service like OpenAI, Anthropic, etc.
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const responses = [
      "I'm an AI assistant created by dFusion to help you with your questions about the DLP miner and blockchain technology.",
      "That's an interesting question! Let me help you understand this better.",
      "Based on what you're asking, here's what I can tell you...",
      "I'd be happy to help you with that. Here's my response:",
      "Great question! From my understanding of the dFusion ecosystem..."
    ];
    
    return {
      content: responses[Math.floor(Math.random() * responses.length)] + " This is a demo response. In production, this would connect to a real AI service.",
      role: 'assistant'
    };
  }

  private saveConversations(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(this.conversations()));
    }
  }

  private loadConversations(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        try {
          const conversations = JSON.parse(stored);
          this.conversations.set(conversations.map((conv: any) => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
            messages: conv.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          })));
        } catch (error) {
          console.error('Error loading conversations:', error);
        }
      }
    }
  }
} 