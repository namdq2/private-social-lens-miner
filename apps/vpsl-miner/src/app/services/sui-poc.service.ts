import { computed, inject, Injectable, signal } from '@angular/core';
import { TelegramApiService } from './telegram-api.service';
import { fileDto, IFileMetadata, IProcessDataRes } from '../models/social-truth';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { fromHex, toHex } from '@mysten/sui/utils';
import { EncryptedObject, SealClient } from '@mysten/seal';
import { getAllowlistedKeyServers } from '@mysten/seal';
import { WalrusService } from './walrus.service';
import { HttpClient } from '@angular/common/http';
import { HttpService } from './http.service';
import { AppConfigService } from './app-config.service';
import { SubmissionProcessingService } from './submission-processing.service';
import { ISuiPoc, IWalrus } from '../models/app-config';
import { timeout, catchError, throwError } from 'rxjs';
import { TIMEOUT_MS } from '../shared/constants';
import { isElectron } from '../shared/helpers';

declare const window: any;

@Injectable({
  providedIn: 'root',
})
export class SuiPocService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly httpService: HttpService = inject(HttpService);
  private suiClient: SuiClient;
  private sealClient: SealClient;
  private pocConfig: ISuiPoc | null;
  private walrusConfig: IWalrus | null;
  private suiAddress = signal<string>('');

  public suiPublicKey = computed(() => this.suiAddress());

  constructor(
    private readonly telegramApiService: TelegramApiService,
    private readonly walrusService: WalrusService,
    private readonly appConfigService: AppConfigService,
    private readonly submissionProcessingService: SubmissionProcessingService,
  ) {
    this.pocConfig = this.appConfigService.suiPoc;
    this.walrusConfig = this.appConfigService.walrus;
    // set up SUI client
    this.suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
    // set up Seal client
    const keyServers = getAllowlistedKeyServers('testnet') || [];
    this.sealClient = new SealClient({
      suiClient: this.suiClient,
      serverObjectIds: keyServers.map((id) => [id, 1]),
      verifyKeyServers: false,
    });

    if (isElectron()) {
      window.electron.onExecuteBackgroundTaskCode((event: any, message: any) => {
        console.warn('Received message from main process:', message);
        if (this.telegramApiService.isAuthorized) {
          this.doSuiPoc();
        } else {
          this.submissionProcessingService.setVanaProcessErr('Not signed in to Telegram. Sign in to continue.');
        }
      });
    }
  }

  public async createPolicyViaRelay(): Promise<string> {
    try {
      const requestBody = {
        packageObjectId: this.pocConfig?.packageId || '',
        dlpWalletAddress: this.pocConfig?.dlpWalletAddress || ''
      };

      const response = await this.httpClient
        .post<{ digest: string; policyObjectId: string }>(`${this.appConfigService.relayApi?.baseUrl}/api/relay/sui/create-policy`, requestBody, {
          headers: {
            'accept': 'application/json',
            'x-custom-lang': 'en',
            'Content-Type': 'application/json',
            'x-api-key': this.appConfigService.relayApi?.apiKey || ''
          }
        })
        .pipe(
          timeout(TIMEOUT_MS.THREE_MINUTES),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              console.error('Request timed out');
              this.submissionProcessingService.setSuiProcessErr('Request timed out. Please try again.');
              return throwError(() => new Error('Request timed out. Please try again.'));
            }
            return throwError(() => error);
          }),
        )
        .toPromise();

      if (!response || !response.policyObjectId) {
        throw new Error('Failed to create policy via relay service. Please try again.');
      }

      return response.policyObjectId;
    } catch (err) {
      console.error('Failed to create policy via relay service', err);
      this.submissionProcessingService.setSuiProcessErr('Failed to create policy via relay service');
      throw new Error('Failed to create policy via relay service. Please try again.');
    }
  }

  public async getTelechat(): Promise<string> {
    try {
      const fileDto: fileDto = await this.telegramApiService.transformChatsToFileDto('');
      return JSON.stringify(fileDto);
    } catch (err) {
      console.error('Failed to get telechat', err);
      this.submissionProcessingService.setSuiProcessErr('Failed to get chat info');
      throw new Error('Failed to get telechat. Please try again.');
    }
  }

  public async saveEncryptedFileViaRelay(fileId: string, policyObjId: string, metadata: IFileMetadata): Promise<string> {
    try {
      const requestBody = {
        fileId: fileId,
        policyObjId: policyObjId,
        metadata: metadata
      };

      const response = await this.httpClient
        .post<{ digest: string; onChainFileObjId: string }>(`${this.appConfigService.relayApi?.baseUrl}/api/relay/sui/save-encrypted-file`, requestBody, {
          headers: {
            'accept': 'application/json',
            'x-custom-lang': 'en',
            'Content-Type': 'application/json',
            'x-api-key': this.appConfigService.relayApi?.apiKey || ''
          }
        })
        .pipe(
          timeout(TIMEOUT_MS.THREE_MINUTES),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              console.error('Request timed out');
              this.submissionProcessingService.setSuiProcessErr('Request timed out. Please try again.');
              return throwError(() => new Error('Request timed out. Please try again.'));
            }
            return throwError(() => error);
          }),
        )
        .toPromise();

      if (!response || !response.onChainFileObjId) {
        throw new Error('Failed to save encrypted file via relay service. Please try again.');
      }

      return response.onChainFileObjId;
    } catch (err) {
      console.error('Failed to save encrypted file via relay service', err);
      this.submissionProcessingService.setSuiProcessErr('Failed to save encrypted file via relay service');
      throw new Error('Failed to save encrypted file via relay service. Please try again.');
    }
  }

  public async processDataWithWorker(blobId: string, onChainFileObjId: string, policyObjectId: string, threshold: number) {
    try {
      const processParams = {
        blobId: blobId,
        onchainFileId: onChainFileObjId,
        policyId: policyObjectId,
        jobType: 'both',
        priority: 5
      };

      const response = await this.httpService
        .post<IProcessDataRes>('jobs/data-processing', processParams)
        .pipe(
          timeout(TIMEOUT_MS.THREE_MINUTES),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              console.error('Request timed out after 3 minutes');
              this.submissionProcessingService.setSuiProcessErr('Request timed out. Please try again.');
              return throwError(() => new Error('Request timed out. Please try again.'));
            }
            return throwError(() => error);
          }),
        )
        .toPromise();

      if (!response) {
        throw new Error('No response received from worker');
      }

      this.submissionProcessingService.setSuiProcessDone();
      this.submissionProcessingService.setProcessedData({
        walrusUrl: `${this.walrusConfig?.aggregatorUrl}/blobs/${blobId}`,
        unprocessedWalrusUrl: `${this.walrusConfig?.aggregatorUrl}/blobs/${blobId}`,
        unprocessedOnChainFileUrl: `${this.pocConfig?.suiScanUrl}/${onChainFileObjId}`,
        attestationUrl: `${this.pocConfig?.suiScanUrl}/${onChainFileObjId}`,
        onChainFileUrl: `${this.pocConfig?.suiScanUrl}/${onChainFileObjId}`,
        policyObjectUrl: `${this.pocConfig?.suiScanUrl}/${policyObjectId}`,
      });

      return response;
    } catch (err) {
      this.submissionProcessingService.setSuiProcessErr('Oops! We couldn’t start processing your file. Please try again.');
      console.error('Failed to process data with worker', err);
      throw new Error('Failed to process data with worker. Please try again.');
    }
  }

  public async encryptData(policyObjId: string, teleChat: string) {
    try {
      const policyObjectBytes = fromHex(policyObjId);
      const nonce = crypto.getRandomValues(new Uint8Array(5));
      const id = toHex(new Uint8Array([...policyObjectBytes, ...nonce]));

      const { encryptedObject: encryptedBytes } = await this.sealClient.encrypt({
        threshold: this.pocConfig?.threshold || 2,
        packageId: this.pocConfig?.packageId || '',
        id,
        data: new Uint8Array(new TextEncoder().encode(teleChat)),
      });

      if (!encryptedBytes) {
        throw new Error('Failed to encrypt data');
      }

      return encryptedBytes;
    } catch (err) {
      this.submissionProcessingService.setSuiProcessErr('Failed to encrypt data');
      console.error('Failed to encrypt data', err);
      throw new Error('Failed to encrypt data. Please try again.');
    }
  }

  private async doInternalEncryption(teleChat: string) {
    try {
      const requestBody = {
        telegramChats: teleChat,
      };

      const response = await this.httpClient.post<{ encryptedChats: string }>(
        `${this.appConfigService.relayApi?.baseUrl}/api/relay/nautilus-tee/encrypt`,
        requestBody,
        {
          headers: {
            'accept': 'application/json',
            'x-custom-lang': 'en',
            'Content-Type': 'application/json',
            'x-api-key': this.appConfigService.relayApi?.apiKey || ''
          }
        }
      ).pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      ).toPromise();

      if (!response || !response.encryptedChats) {
        throw new Error('Failed to encrypt file via relay service. Please try again.');
      }

      return response.encryptedChats;
    }
    catch(err) {
      console.error('Failed to encrypted file via relay service', err);
      // this.submissionProcessingService.setSuiProcessErr('Failed to encrypted file via relay service');
      throw new Error('Failed to encrypt file via relay service. Please try again.');
    }
  }

  public async doSuiPoc() {
    const policyObjId = await this.createPolicyViaRelay();
    const teleChat = await this.getTelechat();

    const encryptedTeleChat = await this.doInternalEncryption(teleChat);

    const encryptedBytes = await this.encryptData(policyObjId, encryptedTeleChat);

    let walrusUploadRes
    try {
      walrusUploadRes = await this.walrusService.uploadFileToWalrus(new File([encryptedBytes], 'encryptedFile'));
    } catch (error) {
      this.submissionProcessingService.setSuiProcessErr('Failed to upload encrypted data to Walrus storage. Please try again.');
      throw new Error('Failed to upload encrypted data to Walrus storage. Please try again.');
    }
    const blobId = walrusUploadRes.split('/').pop() || '';

    const metadata: IFileMetadata = {
      walrusUrl: walrusUploadRes,
      size: encryptedBytes.length,
    };

    const encryptedData = new Uint8Array(encryptedBytes);
    const encryptedObject = EncryptedObject.parse(encryptedData);
    const onChainFileObjId = await this.saveEncryptedFileViaRelay(encryptedObject.id, policyObjId, metadata);

    const processDataRes = await this.processDataWithWorker(blobId, onChainFileObjId, policyObjId, this.pocConfig?.threshold || 2);
    console.log('🚀 ~ Nautilus Processed data:', processDataRes?.data);
  }
}
