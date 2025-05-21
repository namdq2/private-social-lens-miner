import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isElectron } from '../shared/helpers';
import { fileDto } from '../models/social-truth';
import { SubmissionProcessingService } from './submission-processing.service';
import { CryptographyService } from './cryptography.service';
import { PinataApiService } from './pinata-api.service';
import { Web3WalletService } from './web3-wallet.service';
import { GelatoApiService } from './gelato-api.service';
import { AppConfigService } from './app-config.service';
import { WhatsAppIpcService } from './whatsapp-ipc.service';

// Declare the window interface to access the API from Electron
declare const window: any;

export interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  timestamp: number;
  unreadCount: number;
  selected?: boolean;
}

export interface WhatsAppMessage {
  id: string;
  body: string;
  fromMe: boolean;
  sender: string;
  timestamp: number;
  hasMedia: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WhatsAppService {
  private whatsappAPI: any;
  private _isConnected = new BehaviorSubject<boolean>(false);
  private _qrCode = new BehaviorSubject<string | null>(null);
  private _chats = new BehaviorSubject<WhatsAppChat[]>([]);
  private _selectedChat = new BehaviorSubject<WhatsAppChat | null>(null);
  private _messages = new BehaviorSubject<WhatsAppMessage[]>([]);
  private _loading = new BehaviorSubject<boolean>(false);
  private _error = new BehaviorSubject<string | null>(null);
  private _apiAvailable = new BehaviorSubject<boolean>(false);

  public chats = signal<WhatsAppChat[]>([]);
  public selectedChats = signal<WhatsAppChat[]>([]);
  public isConnected = signal<boolean>(false);

  constructor(
    private readonly submissionProcessingService: SubmissionProcessingService,
    private readonly cryptographyService: CryptographyService,
    private readonly pinataApiService: PinataApiService,
    private readonly web3WalletService: Web3WalletService,
    private readonly gelatoApiService: GelatoApiService,
    private readonly appConfigService: AppConfigService,
    private readonly whatsAppIpcService: WhatsAppIpcService,
  ) {
    if (isElectron()) {
      this.initializeAPI();
      this.initialize();

      // Listen for messages from the main process
      window.whatsappAPI.onExecuteBackgroundWhatsappTaskCode((event: any, message: any) => {
        console.warn('Received message from main process:', message);
        if (this.isConnected()) {
          this.runAutoSubmission(message);
        } else {
          this.submissionProcessingService.startProcessingState();
          this.submissionProcessingService.displayError('Not signed in to WhatsApp. Sign in to continue.');
        }
      });
    }
  }

  private initializeAPI(): void {
    // Make sure the API is available before using it
    try {
      if (window.whatsappAPI) {
        console.log('Found real WhatsApp API');
        this.whatsappAPI = window.whatsappAPI;
        this._apiAvailable.next(true);
        this.setupListeners();
        this.checkConnectionStatus();
      } else {
        console.warn('WhatsApp API not available - window.whatsappAPI is undefined, using stub API');
        // Create a stub API to avoid errors
        this.createStubApi();
        this._error.next('WhatsApp API is not available. The app will operate in limited mode.');
        this._apiAvailable.next(false);
      }
    } catch (error) {
      console.error('Error initializing WhatsApp API:', error);
      this._error.next('Cannot initialize WhatsApp API. Please restart the application.');
      this._apiAvailable.next(false);
    }
  }

  /**
   * Create a stub API to avoid errors in case the preload script is not working
   */
  private createStubApi() {
    console.log('Creating stub WhatsApp API');
    this.whatsappAPI = {
      initialize: () => {
        console.log('[STUB] Initializing WhatsApp');
        this._error.next('Cannot connect to WhatsApp: API is not available.');
        return Promise.resolve(false);
      },
      getQRCode: () => {
        console.log('[STUB] Getting QR code');
        return Promise.resolve(null);
      },
      isConnected: () => {
        console.log('[STUB] Checking connection');
        return Promise.resolve(false);
      },
      getChats: () => {
        console.log('[STUB] Getting chats');
        return Promise.resolve([]);
      },
      getMessages: () => {
        console.log('[STUB] Getting messages');
        return Promise.resolve([]);
      },
      logout: () => {
        console.log('[STUB] Logging out');
        return Promise.resolve(true);
      },
      onQRCodeUpdate: (callback: (qrCode: string) => void) => {
        console.log('[STUB] Setting QR code listener');
        return () => {};
      },
      onConnectionStatusChange: (callback: (status: boolean) => void) => {
        console.log('[STUB] Setting connection status listener');
        return () => {};
      },
      onError: (callback: (error: string) => void) => {
        console.log('[STUB] Setting error listener');
        return () => {};
      },
      removeAllListeners: () => {
        console.log('[STUB] Removing all listeners');
      },
    };

    // Assign the stub API to window so other code can use it
    if (window) {
      window.whatsappAPI = this.whatsappAPI;
    }
  }

  private setupListeners() {
    if (!this.whatsappAPI) {
      console.error('Cannot setup listeners - WhatsApp API not available');
      return;
    }

    // Listen for QR code updates
    this.whatsappAPI.onQRCodeUpdate((qrCode: string) => {
      console.log('QR code received');
      this._qrCode.next(qrCode);
    });

    // Listen for connection status changes
    this.whatsappAPI.onConnectionStatusChange((status: boolean) => {
      console.log('Connection status changed:', status);
      this.isConnected.set(status);
      this._isConnected.next(status);
      if (status) {
        this._qrCode.next(null);
        this.loadChats();
      } else {
        this._chats.next([]);
        this._selectedChat.next(null);
        this._messages.next([]);
      }
    });

    // Listen for errors
    this.whatsappAPI.onError((error: string) => {
      console.error('WhatsApp error:', error);
      this._error.next(error);
    });
  }

  private async checkConnectionStatus() {
    if (!this.whatsappAPI) return;

    try {
      console.log('Checking WhatsApp connection status');
      const status = await this.whatsappAPI.isConnected();
      console.log('WhatsApp connection status:', status);
      this._isConnected.next(status);
      if (status) {
        await this.loadChats();
      }
    } catch (error) {
      console.error('Failed to check WhatsApp connection status', error);
      this._error.next('Cannot check WhatsApp connection status');
    }
  }

  // Initialize WhatsApp connection
  public async initialize(): Promise<boolean> {
    if (!this.whatsappAPI) {
      this._error.next('WhatsApp API is not available. Please restart the application.');
      return false;
    }

    try {
      this._loading.next(true);
      this._error.next(null);
      console.log('Initializing WhatsApp client');
      const result = await this.whatsappAPI.initialize();
      console.log('WhatsApp initialization result:', result);
      return result;
    } catch (error) {
      console.error('Failed to initialize WhatsApp', error);
      this._error.next('Cannot connect to WhatsApp');
      return false;
    } finally {
      this._loading.next(false);
    }
  }

  // Get chat list
  public async loadChats(): Promise<WhatsAppChat[]> {
    if (!this.whatsappAPI) return [];

    try {
      this._loading.next(true);
      this._error.next(null);
      const chats = await this.whatsappAPI.getChats();
      this._chats.next(chats);
      this.chats.set(chats);
      return chats;
    } catch (error) {
      console.error('Failed to load chats', error);
      this._error.next('Cannot load chat list');
      return [];
    } finally {
      this._loading.next(false);
    }
  }

  // Get messages from a chat
  public async loadMessages(chatId: string, limit: number = 100): Promise<WhatsAppMessage[]> {
    if (!this.whatsappAPI) return [];

    try {
      this._loading.next(true);
      this._error.next(null);
      const messages = await this.whatsappAPI.getMessages(chatId, limit);
      this._messages.next(messages);

      // Update the selected chat
      const selectedChat = this._chats.value.find((chat) => chat.id === chatId);
      if (selectedChat) {
        this._selectedChat.next(selectedChat);
      }

      return messages;
    } catch (error) {
      console.error('Failed to load messages', error);
      this._error.next('Cannot load messages');
      return [];
    } finally {
      this._loading.next(false);
    }
  }

  // Logout
  public async logout(): Promise<boolean> {
    if (!this.whatsappAPI) return false;

    try {
      this._loading.next(true);
      this._error.next(null);
      await this.whatsappAPI.logout();
      this._isConnected.next(false);
      this._qrCode.next(null);
      this._chats.next([]);
      this._selectedChat.next(null);
      this._messages.next([]);
      return true;
    } catch (error) {
      console.error('Failed to logout', error);
      this._error.next('Không thể đăng xuất khỏi WhatsApp');
      return false;
    } finally {
      this._loading.next(false);
    }
  }

  // Select multiple chats
  public selectChat(chatId: string, selected: boolean): void {
    const chats = [...this._chats.value];
    const chatIndex = chats.findIndex((chat) => chat.id === chatId);

    if (chatIndex !== -1) {
      chats[chatIndex] = { ...chats[chatIndex], selected };
      this._chats.next(chats);
    }
  }

  // Get the list of selected chats
  public getSelectedChats(): WhatsAppChat[] {
    return this._chats.value.filter((chat) => chat.selected);
  }

  // Revert all chat selection
  public clearSelection(): void {
    const chats = this._chats.value.map((chat) => ({
      ...chat,
      selected: false,
    }));
    this._chats.next(chats);
  }

  public async runAutoSubmission(data: string) {
    console.log('Executing code in Angular service with data:', data);
    await this.loadChats();

    if (this.whatsAppIpcService.isUploadAllWhatsappChats()) {
      const fullChatList = [...this.chats()];
      this.selectedChats.set(fullChatList);
    } else {
      const preSelectedChats = this.selectedChats();
      const selectedChatsForSubmission: Array<WhatsAppChat> = [];
      this.chats().forEach((chat) => {
        if (preSelectedChats.some((preSelected) => preSelected.id === chat.id)) {
          selectedChatsForSubmission.push(chat);
        }
      });
      this.selectedChats.set(selectedChatsForSubmission);
      this.whatsAppIpcService.setSelectedWhatsappChatIdsList(selectedChatsForSubmission.map((chat) => chat.id));
    }

    this.submissionProcessingService.startProcessingState();
    if (this.selectedChats().length > 0) {
      await this.initiateSubmission();
    } else {
      this.submissionProcessingService.displayError('No chats selected for submission.');
    }
  }

  public async initiateSubmission() {
    console.log('this.selectedChats()', this.selectedChats());

    const userInfo = await this.whatsappAPI.getInfo();
    console.log('userInfo', userInfo);
    const token = userInfo.wid._serialized;

    //TODO: Send message to Whatsapp bot to get the token


    await this.doWhatsappSubmission(token);
  }

  // TODO: Implement the function to receive a message from the WhatsApp bot and call to doWhatsappSubmission
  public async onReceiveMessage(event: any) {
    console.log('Received message from WhatsApp bot:', event);
    const token = event.token;
    await this.doWhatsappSubmission(token);
  }

  public async doWhatsappSubmission(token: string) {
    try {
      // * 1. sign message - get signature
      const encryptionKey = this.web3WalletService.encryptionKey(); // signature from signed message
      console.log('encryptionKey', encryptionKey);
      if (!encryptionKey) {
        console.error('Signature / encryption does not exist!');
        throw new Error('Unable to encrypt data. Please reinstall the miner app.');
      }

      this.gelatoApiService.currentSignature.set(encryptionKey);
      this.gelatoApiService.currentSocialType.set('whatsapp');

      const uploadedEncryptedFileUrl = await this.encryptAndUploadFile(token, encryptionKey);
      console.log('uploadedEncryptedFileUrl', uploadedEncryptedFileUrl);
      this.submissionProcessingService.displayInfo('Data has been encrypted');
      if (uploadedEncryptedFileUrl) {
        // * 5. get public key
        // * 6. encrypt signature with public key (EEK)
        const encryptedEncryptionKey = await this.cryptographyService.encryptWithWalletPublicKey(encryptionKey, this.appConfigService.vana!.dlpPublicKey);
        console.log('encryptedEncryptionKey', encryptedEncryptionKey);
        // * 7. addFileWithPermissions to vana dataregistry
        // * 8. get file id
        await this.gelatoApiService.relayAddFileWithPermissions(encryptedEncryptionKey, uploadedEncryptedFileUrl);
        this.submissionProcessingService.displayInfo('Data is being added to the data registry');
      } else {
        console.error('no upload file url');
        throw new Error('Failed to submit encrypted data. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to doWhatsappSubmission');
      this.submissionProcessingService.displayError(err);
    }
  }

  private async encryptAndUploadFile(token: string, signature: string) {
    try {
      this.submissionProcessingService.displayInfo('WhatsApp Data is being encrypted');
      // * 2. encrypt data with signature
      const fileDto: fileDto = await this.transformChatsToFileDto(token);
      const jsonBlob = new Blob([JSON.stringify(fileDto)], { type: 'application/json' }); // Convert JSON object into a Blob
      const file = new File([jsonBlob], `whatsapp-${new Date().getTime()}.json`, { type: 'application/json' }); // Create a File from the Blob
      const encryptedData = await this.cryptographyService.clientSideEncrypt(file, signature); // user symmetric encryption key - can encrypt and decrypt using the same key, itself
      // * 3. upload file to pinata ipfs
      // * 4. get pinata file url
      return await this.pinataApiService.uploadFileToPinata(encryptedData);
    } catch (err) {
      console.error('encryptAndUploadFile failed', err);
      throw new Error('Failed to submit encrypted data. Please try again.');
    }
  }

  public async transformChatsToFileDto(token: string): Promise<any> {
    if (!this.whatsappAPI) return null;

    const selectedChats = this.getSelectedChats();
    if (selectedChats.length === 0) return null;

    const chatsData = [];

    for (const chat of selectedChats) {
      const messages = await this.whatsappAPI.getMessages(chat.id, 50); // Get the latest 50 messages

      chatsData.push({
        chatId: chat.id,
        chatName: chat.name || chat.id,
        isGroup: chat.isGroup,
        contents: messages,
      });
    }

    const userInfo = await this.whatsappAPI.getInfo();
    const userId = userInfo.wid._serialized;
    const fileDto = {
      revision: '01.01',
      source: 'whatsapp',
      user: userId,
      submission_token: token,
      chats: chatsData,
    };
    console.log('fileDto', fileDto);
    return fileDto;
  }

  // Try to reload the API
  public reloadApi(): void {
    console.log('Manual reload of WhatsApp API requested');
    this.initializeAPI();
  }

  // Observables to allow components to subscribe
  get isConnected$(): Observable<boolean> {
    return this._isConnected.asObservable();
  }

  get qrCode$(): Observable<string | null> {
    return this._qrCode.asObservable();
  }

  get chats$(): Observable<WhatsAppChat[]> {
    return this._chats.asObservable();
  }

  get selectedChat$(): Observable<WhatsAppChat | null> {
    return this._selectedChat.asObservable();
  }

  get messages$(): Observable<WhatsAppMessage[]> {
    return this._messages.asObservable();
  }

  get loading$(): Observable<boolean> {
    return this._loading.asObservable();
  }

  get error$(): Observable<string | null> {
    return this._error.asObservable();
  }

  get apiAvailable$(): Observable<boolean> {
    return this._apiAvailable.asObservable();
  }

  public async initialisePreSelectedChats() {
    await this.loadChats();

    if (this.whatsAppIpcService.selectedWhatsappChatIdsList()?.length > 0) {
      const selectedChats: Array<WhatsAppChat> = [];
      this.chats().forEach((chat) => {
        if (this.whatsAppIpcService.selectedWhatsappChatIdsList().some((preSelected) => preSelected === chat.id)) {
          selectedChats.push(chat);
        }
      });
      this.selectedChats.set(selectedChats);
    }
  }
}
