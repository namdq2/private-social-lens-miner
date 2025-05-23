import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';
import { app } from 'electron';
import * as path from 'path';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';

export class WhatsAppService extends EventEmitter {
  private client: Client;
  private isReady = false;
  private qrCodeData: string | null = null;
  private chromiumExecutablePath: string | null = null;

  constructor() {
    super();
  }

  private async downloadChromium(): Promise<string | null> {
    try {
      console.log('Downloading Chromium using Puppeteer...');
      const browser = await puppeteer.launch();
      const executablePath = browser.process().spawnfile;
      console.log(`Chromium executable path: ${executablePath}`);
      await browser.close();
      return executablePath;
    } catch (error) {
      console.error('Failed to download Chromium:', error);
      return null;
    }
  }

  private setupEventListeners() {
    // Add detailed logging for each event
    // Event when QR code needs to be scanned
    this.client.on('qr', async (qr) => {
      try {
        console.log('WhatsApp QR code received, converting to data URL');
        // Create QR code as data URL
        this.qrCodeData = await qrcode.toDataURL(qr);
        // Emit event with QR code data
        this.emit('qrcode', this.qrCodeData);
      } catch (error) {
        console.error('Failed to generate QR code', error);
        this.emit('error', `Failed to generate QR code: ${error.message}`);
      }
    });

    // Event when client is authenticated successfully
    this.client.on('ready', () => {
      console.log('WhatsApp client is ready');
      this.isReady = true;
      this.qrCodeData = null;
      // Emit event for successful connection
      this.emit('connection', true);
    });

    // Event when client is authenticated successfully
    this.client.on('authenticated', () => {
      console.log('WhatsApp client authenticated successfully');
    });

    // Event when client receives a message
    this.client.on('message', async (message) => {
      console.log('WhatsApp client received a message:', message);
      // Format the message data before emitting
      this.emit('received_message', {
        id: message.id._serialized,
        body: message.body,
        fromMe: message.fromMe,
        sender: message.author || message.from,
        timestamp: message.timestamp,
        hasMedia: message.hasMedia,
      });
    });

    // Handle disconnection
    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected', reason);
      this.isReady = false;
      // Emit event for disconnection
      this.emit('connection', false);
      this.emit('error', `WhatsApp disconnected: ${reason}`);
    });

    // Handle authentication failure
    this.client.on('auth_failure', (error) => {
      console.error('WhatsApp authentication failed', error);
      this.emit('auth_error', `Authentication failed: ${error}`);
    });

    // Listen for general errors
    this.client.on('error', (error) => {
      console.error('WhatsApp client error:', error);
      this.emit('error', `WhatsApp client error: ${error.message || error}`);
    });

    // Listen for loading screen events for better debugging
    this.client.on('loading_screen', (percent, message) => {
      console.log(`WhatsApp loading: ${percent}% - ${message}`);
    });
  }

  // Initialize connection
  public async initialize() {
    try {
      console.log('Initializing WhatsApp client');
      console.log(`Platform: ${process.platform}, Arch: ${process.arch}`);

      // Download Chromium and get its executable path
      this.chromiumExecutablePath = await this.downloadChromium();

      // Recreate the client with the downloaded Chromium
      if (this.chromiumExecutablePath) {
        const sessionPath = path.join(app.getPath('userData'), 'whatsapp-sessions');
        const cachePath = path.join(app.getPath('userData'), 'whatsapp-cache');

        fs.mkdirSync(sessionPath, { recursive: true });
        fs.mkdirSync(cachePath, { recursive: true });

        console.log('Using downloaded Chromium executable path:', this.chromiumExecutablePath);
        // Recreate client with local auth strategy and the downloaded Chromium
        this.client = new Client({
          authStrategy: new LocalAuth({
            dataPath: sessionPath,
          }),
          puppeteer: {
            headless: true,
            executablePath: this.chromiumExecutablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          },
          webVersionCache: {
            type: 'local',
            path: cachePath,
          },
        });

        // Re-register event listeners with the new client
        this.setupEventListeners();
      } else {
        console.log('Could not download Chromium, using default configuration');
      }

      // Add a timeout to prevent hanging indefinitely
      const initPromise = this.client.initialize();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp initialization timed out after 60 seconds')), 60000));

      await Promise.race([initPromise, timeoutPromise]);
      console.log('WhatsApp client initialization successful');
      return true;
    } catch (error) {
      console.error('Failed to initialize WhatsApp client', error);
      this.emit('error', `Failed to initialize WhatsApp client: ${error.message || JSON.stringify(error)}`);

      // Check for specific errors
      if (error.message?.includes('timeout')) {
        this.emit('error', 'WhatsApp initialization timed out. Your network might be slow or blocked.');
      } else if (error.message?.includes('Protocol error')) {
        this.emit('error', 'Browser protocol error. Try updating your Chromium/Chrome browser.');
      } else if (error.message?.includes('ENOENT')) {
        this.emit('error', 'Browser executable not found. Please install Chrome or Chromium browser.');
      }

      return false;
    }
  }

  // Get current QR code
  public getQRCode() {
    return this.qrCodeData;
  }

  // Check connection status
  public isConnected() {
    return this.isReady;
  }

  public getInfo() {
    return this.client.info;
  }

  // Get list of chats
  public async getChats() {
    if (!this.isReady) {
      throw new Error('WhatsApp client not ready');
    }

    try {
      console.log('Fetching chats');
      const chats = await this.client.getChats();
      return chats.map((chat) => ({
        id: chat.id._serialized,
        name: chat.name || chat.id._serialized,
        isGroup: chat.isGroup,
        timestamp: chat.timestamp,
        unreadCount: chat.unreadCount,
      }));
    } catch (error) {
      console.error('Failed to fetch chats', error);
      throw error;
    }
  }

  // Get messages from a chat
  public async getMessages(chatId: string, limit: number = 100) {
    if (!this.isReady) {
      throw new Error('WhatsApp client not ready');
    }

    try {
      console.log(`Fetching messages for chat ${chatId}`);
      const chat = await this.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });

      return messages.map((msg) => ({
        id: msg.id._serialized,
        body: msg.body,
        fromMe: msg.fromMe,
        sender: msg.author || msg.from,
        timestamp: msg.timestamp,
        hasMedia: msg.hasMedia,
      }));
    } catch (error) {
      console.error('Failed to fetch messages', error);
      throw error;
    }
  }

  // Send message to a chat
  public async sendMessage(chatId: string, message: string) {
    if (!this.isReady) {
      throw new Error('WhatsApp client not ready');
    }

    try {
      console.log(`Sending message to chat ${chatId}`);
      const chat = await this.client.getChatById(chatId);
      const sentMessage = await chat.sendMessage(message);

      return {
        id: sentMessage.id.id,
        body: sentMessage.body,
        fromMe: sentMessage.fromMe,
        sender: sentMessage.author || sentMessage.from,
        timestamp: sentMessage.timestamp,
        hasMedia: sentMessage.hasMedia,
      };
    } catch (error) {
      console.error('Failed to send message', error);
      throw error;
    }
  }

  // Logout
  public async logout() {
    try {
      console.log('Logging out from WhatsApp');
      await this.client.logout();
      this.isReady = false;
      this.emit('connection', false);
      return true;
    } catch (error) {
      console.error('Failed to logout', error);
      throw error;
    }
  }
}
