export interface AiMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AiConversation {
  id: string;
  title: string;
  messages: AiMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AiChatConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiChatRequest {
  messages: Pick<AiMessage, 'content' | 'role'>[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AiChatResponse {
  content: string;
  role: 'assistant';
} 