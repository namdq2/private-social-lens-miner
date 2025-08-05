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

export enum AiModelOptions {
  CLAUDE = 'claude-3-5-sonnet-20241022',
  GEMINI = 'gemini-1.5-flash',
}

export enum AiProviderOptions {
  CLAUDE = 'claude',
  GEMINI = 'gemini',
}

export interface IChatStreamParams {
  content: string;
  conversationId: string;
}

export interface Options {
  provider: AiProviderOptions;
  model: AiModelOptions;
  temperature: number;
  maxTokens: number;
}

export interface IConversationsData {
  data: IConversation[];
  hasNextPage: boolean;
}

export interface IConversation {
  title: string;
  user: IUser;
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface IUser {
  id: number;
  firstName: string;
  lastName: string;
  role: IRole;
  status: IStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: any;
}

export interface IRole {
  id: number;
  name: string;
  __entity: string;
}

export interface IStatus {
  id: number;
  name: string;
  __entity: string;
}

export interface IMessagesDataRes {
  data: IMessage[];
  hasNextPage: boolean;
}

export interface IMessage {
  id: string;
  content: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITelegramLoginResponse {
  refreshToken: string;
  token: string;
  tokenExpires: number;
  user: ITelegramUser;
}

export interface ITelegramUser {
  id: number;
  email: any;
  provider: string;
  socialId: string;
  firstName: string;
  lastName: string;
  role: ITelegramUserRole;
  status: ITelegramUserStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: any;
}

export interface ITelegramUserRole {
  id: number;
  name: string;
  __entity: string;
}

export interface ITelegramUserStatus {
  id: number;
  name: string;
  __entity: string;
}

export interface ITokenGatingConfig {
  id: string;
  createdAt: string;
  updatedAt: string;
  stakeThreshold: string;
  balanceThreshold: string;
}
