import { inject, Injectable, signal } from '@angular/core';
import { Api, TelegramClient } from 'telegram';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { TotalList } from 'telegram/Helpers';
import { StringSession } from 'telegram/sessions';
import { Dialog } from 'telegram/tl/custom/dialog';
import { chatDto, fileDto } from '../models/social-truth';
import { isElectron } from '../shared/helpers';
import { AppConfigService } from './app-config.service';
import { CryptographyService } from './cryptography.service';
import { ElectronIpcService } from './electron-ipc.service';
import { GelatoApiService } from './gelato-api.service';
import { PinataApiService } from './pinata-api.service';
import { SubmissionProcessingService } from './submission-processing.service';
import { Web3WalletService } from './web3-wallet.service';
import { RefinementApiService } from './refinement-api.service';

declare const window: any;

@Injectable({
  providedIn: 'root',
})
export class TelegramApiService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly submissionProcessingService: SubmissionProcessingService = inject(SubmissionProcessingService);
  private readonly cryptographyService: CryptographyService = inject(CryptographyService);
  private readonly pinataApiService: PinataApiService = inject(PinataApiService);
  private readonly gelatoApiService: GelatoApiService = inject(GelatoApiService);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly refinementApiService: RefinementApiService = inject(RefinementApiService);

  private readonly LOCAL_STORAGE_SESSION_KEY = 'telegram-session';
  private currentPhoneCodeHash: string = '';

  public SESSION = new StringSession(''); // create a new StringSession, also you can use StoreSession

  private get apiId() {
    return this.appConfigService.telegram!.apiId;
  }

  private get apiHash() {
    return this.appConfigService.telegram!.apiHash;
  }

  public telegramClient = new TelegramClient(this.SESSION, this.apiId, this.apiHash, { connectionRetries: 5 });

  public isAuthorized = false;
  public userId = signal<number>(-1);

  public telegramDialogs = signal<TotalList<Dialog>>(new TotalList<Dialog>());
  public selectedDialogsList = signal<Array<Dialog>>([]);

  constructor() {
    // Get session from local storage
    const storedSession = localStorage.getItem(this.LOCAL_STORAGE_SESSION_KEY);
    this.SESSION = storedSession ? new StringSession(JSON.parse(storedSession)) : new StringSession('');

    // Immediately create a client using your application data
    this.telegramClient = new TelegramClient(this.SESSION, this.apiId, this.apiHash, { connectionRetries: 5 });

    this.telegramClient.connect().then((telegramStoredSessionConnectResult: boolean) => {
      this.checkAuthorization();
    });

    // Listen for messages from the main process
    if (isElectron()) {
      window.electron.onExecuteBackgroundTaskCode((event: any, message: any) => {
        console.warn('Received message from main process:', message);
        if (this.isAuthorized) {
          this.runAutoSubmission(message);
        }
        else {
          this.submissionProcessingService.startProcessingState();
          this.submissionProcessingService.displayError('Not signed in to Telegram. Sign in to continue.');
        }
      });

      // window.electron.onBackgroundTaskFailed((event: any, message: any) => {
      //   console.warn('Received message from main process:', message);
      //   this.submissionProcessingService.displayError('Auto-submission failed due to a timeout error. Please restart the auto-submission process.');
      // });
    }
  }

  public async sendCodeHandler(telegramPhoneNumber: string): Promise<boolean> {
    try {
      // Connect to the server
      if (!this.telegramClient.connected) {
        const telegramConnectResult = await this.telegramClient.connect();
        console.log('telegramConnectResult', telegramConnectResult);
      }

      const telegramSendCodeResult: { isCodeViaApp: boolean; phoneCodeHash: string } = await this.telegramClient.sendCode(
        {
          apiId: this.apiId,
          apiHash: this.apiHash,
        },
        telegramPhoneNumber,
      );
      // console.log('telegramSendCodeResult', telegramSendCodeResult);
      this.currentPhoneCodeHash = telegramSendCodeResult.phoneCodeHash;
      return true;
    } catch (error: any) {
      console.error('telegramClient.sendCode', error);
      return false;
    }
  }

  public async clientStartHandler(
    telegramPhoneNumber: string,
    telegramPhoneCode: string,
    // telegramPassword: string,
  ): Promise<boolean> {
    try {
      const authResult = await this.telegramClient.start({
        phoneNumber: telegramPhoneNumber,
        phoneCode: this.userAuthParamCallback(telegramPhoneCode),
        // password: this.userAuthParamCallback(telegramPassword),
        onError: (codeErr: Error) => {
          console.error('codeErr', codeErr);
          throw codeErr;
        },
      });

      // Save session to local storage
      localStorage.setItem(this.LOCAL_STORAGE_SESSION_KEY, JSON.stringify(this.telegramClient.session.save()));

      await this.telegramClient.sendMessage('me', {
        message: `You're successfully logged in!`,
      });

      this.checkAuthorization();

      return true;
    } catch (error) {
      console.error(error);
      // Error handling logic
      return false;
    }
  }

  // ??
  private userAuthParamCallback<T>(param: T): () => Promise<T> {
    return async function () {
      return await new Promise<T>((resolve) => {
        resolve(param);
      });
    };
  }

  private checkAuthorization() {
    this.telegramClient.checkAuthorization().then(async (isAuthorized: boolean) => {
      if (isAuthorized) {
        this.telegramClient.addEventHandler(
          this.newMessageHandler.bind(this),
          new NewMessage({ fromUsers: [this.appConfigService.telegram!.botId] }),
        );

        //   this.telegramClient.addEventHandler((update: Api.TypeUpdate) => {
        //     console.log("Received new Update")
        //     console.log(update);
        // });
        const currentUser = await this.getUser('me');
        this.userId.set(Number(currentUser?.fullUser.id));
        await this.initialisePreSelectedDialogs();
      }

      this.isAuthorized = isAuthorized;
    }).catch((error) => {
      console.error(error);
    });
  }

  public async getDialogs(): Promise<TotalList<Dialog> | null> {
    try {
      // const chatsResult: Api.messages.TypeChats = await this.telegramClient.invoke(
      //   new Api.messages.GetChats({
      //     id: [],
      //   })
      // );
      // console.log('chatsResult', chatsResult);
      // return chatsResult;
      const dialogs = await this.telegramClient.getDialogs({ limit: 100 });
      // console.log('dialogs', dialogs);
      // console.log('...', [...dialogs]);

      this.telegramDialogs.set(dialogs);
      return dialogs;
    } catch (error) {
      console.error('telegramClient.getDialogs', error);
      return null;
    }
  }

  public async getMessages(chatId: number | null) {
    try {
      if (!this.telegramClient.connected) {
        await this.telegramClient.connect();
      }

      if (chatId) {
        const message = await this.telegramClient.getMessages(
          chatId,
          { limit: 50 }
        );
        // console.log('message', message);
        return message;
      } else {
        throw new Error('Invalid chat id');
      }
    } catch (error) {
      console.error('telegramClient.getMessages', error);
      return null;
    }
  }

  public async sendBotMessage(message: string) {
    try {
      if (!this.telegramClient.connected) {
        await this.telegramClient.connect();
      }

      // const sentMessage = await this.telegramClient.sendMessage('me', { message });
      const sentMessage = await this.telegramClient.sendMessage(this.appConfigService.telegram!.botUsername, { message });
      return sentMessage;
    } catch (error: any) {
      console.error('Error sending message to telegram bot:', error);
      throw new Error(error);
    }
  }

  private async getUser(user: string | number) {
    try {
      const telegramUserResult = await this.telegramClient.invoke(
        new Api.users.GetFullUser({
          id: user,
        }),
      );
      console.log('telegramUserResult', telegramUserResult);
      return telegramUserResult;
    } catch (error) {
      console.error('telegramClient GetFullUser', error);
      return null;
    }
  }

  public async logOut() {
    try {
      if (!this.telegramClient.connected) {
        await this.telegramClient.connect();
      }

      const telegramLoggedOutResult: Api.auth.LoggedOut = await this.telegramClient.invoke(new Api.auth.LogOut());
      console.log('telegramLoggedOutResult', telegramLoggedOutResult);
      this.isAuthorized = false;
      this.electronIpcService.stopBackgroundTask();
    } catch (error: any) {
      console.error(error);
      throw new Error(error);
    }
  }

  public async resendCode(phoneNumber: string) {
    try {
      if (!this.telegramClient.connected) {
        await this.telegramClient.connect();
      }

      const telegramResendCodeResult = await this.telegramClient.invoke(
        new Api.auth.ResendCode({
          phoneNumber: phoneNumber,
          phoneCodeHash: this.currentPhoneCodeHash,
        }),
      );
      console.log('telegramResendCodeResult', telegramResendCodeResult);
    } catch (error) {
      console.error(error);
    }
  }

  private async getBotId(): Promise<number | null> {
    try {
      const entity = await this.telegramClient.getEntity(this.appConfigService.telegram!.botUsername);
      if (entity && 'id' in entity) {
        return Number(entity.id);
      } else {
        console.error('Could not get entity or entity has no ID.');
        return null;
      }
    } catch (error) {
      console.error('telegramClient.getEntity failed to get bot ID:', error);
      return null;
    }
  }

  public async getCountryCodes() {
    try {
      if (!this.telegramClient.connected) {
        await this.telegramClient.connect();
      }

      const result = await this.telegramClient.invoke(
        new Api.help.GetCountriesList({
          langCode: 'en',
          hash: 0,
        }),
      );
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }

  private newMessageHandler(newMessageEvent: NewMessageEvent) {
    const botMessage: string = newMessageEvent.message.message;
    console.log('Chat with bot message received (newMessageHandler)', botMessage);
    const authMessagePrefix: string = 'Response:';

    if (botMessage.startsWith(authMessagePrefix)) {
      const authResponseData = botMessage.substring(botMessage.indexOf(authMessagePrefix) + authMessagePrefix.length);
      const authParts = authResponseData.split('||');
      const isValid: boolean = authParts[0].trim().toLowerCase() === 'true';
      const errorText: string = authParts[1];
      const token: string = authParts[2];
      if (isValid) {
        this.doTelegramSubmission(token);
      }
      else {
        console.error('cloudflare / telegrambot', errorText);
        if (errorText === 'invalid-input-response') {
          this.submissionProcessingService.displayInfo('Verification failed. Please try again.');
        }
        // else if (errorText.startsWith('Your recent request was submitted on')) {

        // }
        else {
          this.submissionProcessingService.displayError(errorText);
        }
      }
    }
  }

  public async initialisePreSelectedDialogs() {
    await this.getDialogs();

    if (this.electronIpcService.selectedChatIdsList().length > 0) {
      const preSelectedDialogs: Array<Dialog> = [];
      this.telegramDialogs().forEach(
        telDialog => {
          if (this.electronIpcService.selectedChatIdsList().some(preSelected => Number(preSelected) === Number(telDialog.id))) {
            preSelectedDialogs.push(telDialog);
          }
        }
      );
      this.selectedDialogsList.set(preSelectedDialogs);
    }
  }

  public async runAutoSubmission(data: string) {
    console.log('Executing code in Angular service with data:', data);
    await this.getDialogs();

    if (this.electronIpcService.isUploadAllChats()) {
      const fullDialogList = [...this.telegramDialogs()];
      this.selectedDialogsList.set(fullDialogList);
    }
    else {
      const preSelectedDialogs = this.selectedDialogsList();
      const selectedDialogsForSubmission: Array<Dialog> = [];
      this.telegramDialogs().forEach(
        telDialog => {
          if (preSelectedDialogs.some(preSelected => Number(preSelected.id) === Number(telDialog.id))) {
            selectedDialogsForSubmission.push(telDialog);
          }
        }
      );
      this.selectedDialogsList.set(selectedDialogsForSubmission);
      this.electronIpcService.setSelectedChatIdsList(selectedDialogsForSubmission.map(dialog => Number(dialog.id)));
    }
    // console.log('this.selectedDialogsList()', this.selectedDialogsList());

    this.submissionProcessingService.startProcessingState();
    if (this.selectedDialogsList().length > 0) {
      await this.initiateSubmission();
    }
    else {
      this.submissionProcessingService.displayError('No chats selected for submission.')
    }

  }

  // *** social truth ******************************************************************
  public async initiateSubmission() {
    console.log('this.selectedDialogsList()', this.selectedDialogsList());
    // this.cloudFlareService.openCloudFlareDialog();

    const token = this.userId().toString();
    this.sendBotMessage(`/social_truth_verify|${token}|TelegramMiner`).then(
      (sendBotMsgRes) => {
        console.log('sendBotMsgRes', sendBotMsgRes);
        this.submissionProcessingService.displayInfo('You are being verified');
      }
    ).catch((error) => {
      this.submissionProcessingService.displayError('Failed to verify with @social_truth_bot');
    });
  }

  public async doTelegramSubmission(token: string) {
    try {
      // * 1. Get signature
      const encryptionKey = this.web3WalletService.encryptionKey();
      console.log('encryptionKey', encryptionKey);
      if (!encryptionKey) {
        console.error('Signature / encryption does not exist!');
        throw new Error('Unable to encrypt data. Please reinstall the miner app.');
      }

      this.gelatoApiService.currentSignature.set(encryptionKey);

      const uploadedEncryptedFileUrl = await this.encryptAndUploadFile(token, encryptionKey);
      console.log('uploadedEncryptedFileUrl', uploadedEncryptedFileUrl);
      this.submissionProcessingService.displayInfo('Data has been encrypted');
      
      if (uploadedEncryptedFileUrl) {
        // * Encrypt encryption key with public key
        const encryptedEncryptionKey = await this.cryptographyService.encryptWithWalletPublicKey(
          encryptionKey, 
          this.appConfigService.vana!.dlpPublicKey
        );
        console.log('encryptedEncryptionKey', encryptedEncryptionKey);
        
        // * Add file with permissions to data registry
        await this.gelatoApiService.relayAddFileWithPermissions(encryptedEncryptionKey, uploadedEncryptedFileUrl);
        this.submissionProcessingService.displayInfo('Data is being added to the data registry');
        
        // Wait for fileId to be set (after transaction completed)
        // Use a simple timeout polling mechanism
        let maxAttempts = 30; // 30 seconds timeout
        let fileId = -1;
        
        while (maxAttempts > 0 && fileId === -1) {
          fileId = this.gelatoApiService.currentSubmissionFileId();
          if (fileId !== -1) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          maxAttempts--;
        }
        
        if (fileId !== -1) {
          try {
            // Call refinement service with the fileId
            this.submissionProcessingService.displayInfo('Starting data refinement process');
            const refinementResult = await this.refinementApiService.callRefinementService(
              fileId,
              encryptionKey
            );
            
            this.submissionProcessingService.displayInfo(
              `Data refinement complete. Transaction hash: ${refinementResult.add_refinement_tx_hash}`
            );
          } catch (refinementError) {
            console.error('Failed to refine data:', refinementError);
            // Continue with the normal flow, don't fail the submission
            this.submissionProcessingService.displayInfo(
              'Data refinement failed, but submission process continues'
            );
          }
        }
      } else {
        console.error('no upload file url');
        throw new Error('Failed to submit encrypted data. Please try again.');
      }
    } catch(err: any) {
      console.error('Failed to doTelegramSubmission');
      this.submissionProcessingService.displayError(err);
    }
  }

  private async encryptAndUploadFile(token: string, signature: string) {
    try {
      this.submissionProcessingService.displayInfo('Data is being encrypted');
      // * 2. encrypt data with signature
      const fileDto: fileDto = await this.transformChatsToFileDto(token);
      const jsonBlob = new Blob([JSON.stringify(fileDto)], { type: 'application/json' }); // Convert JSON object into a Blob
      const file = new File([jsonBlob], `telegram-${new Date().getTime()}.json`, { type: 'application/json' }); // Create a File from the Blob
      const encryptedData = await this.cryptographyService.clientSideEncrypt(file, signature); // user symmetric encryption key - can encrypt and decrypt using the same key, itself
      // * 3. upload file to pinata ipfs
      // * 4. get pinata file url
      return await this.pinataApiService.uploadFileToPinata(encryptedData);
    }
    catch(err) {
      console.error('encryptAndUploadFile failed', err);
      throw new Error('Failed to submit encrypted data. Please try again.');
    }
  }

  public async transformChatsToFileDto(token: string) {
    const chatData = this.selectedDialogsList().map(
      (telegramDialog) =>
        ({
          chat_id: Number(telegramDialog.id),
          contents: [],
        } as chatDto),
    );
    // console.log("chatData", chatData);

    // fetch data from telegram
    for (const c of chatData) {
      const totalList: TotalList<Api.Message> = await this.getMessages(c.chat_id) as TotalList<Api.Message>;
      c.contents = [...totalList]; // convert to array
    }

    const fileDto: fileDto = {
      revision: '01.01',
      source: 'telegramMiner',
      user: this.userId().toString(),
      submission_token: token,
      chats: chatData,
    };
    console.log('fileDto', fileDto);
    return fileDto;
  }
}
