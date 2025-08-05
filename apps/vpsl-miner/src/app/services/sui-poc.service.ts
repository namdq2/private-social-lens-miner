import { computed, inject, Injectable, signal } from '@angular/core';
import { TelegramApiService } from './telegram-api.service';
import { fileDto, IFileMetadata, IProcessDataRes } from '../models/social-truth';
import * as bech32 from 'bech32';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
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

@Injectable({
  providedIn: 'root',
})
export class SuiPocService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly httpService: HttpService = inject(HttpService);
  private keypair: Ed25519Keypair | null = null;
  private suiPrivateKey = signal<string>('');
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
    // Initialize keypair from secret key
    // set up SUI client
    this.suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
    // set up Seal client
    const keyServers = getAllowlistedKeyServers('testnet') || [];
    this.sealClient = new SealClient({
      suiClient: this.suiClient,
      serverObjectIds: keyServers.map((id) => [id, 1]),
      verifyKeyServers: false,
    });
  }

  public generateKeyPair() {
    const privateKey = this.suiPrivateKey();

    if (!privateKey) return;

    const decoded = bech32.bech32.decode(privateKey);
    if (!decoded) {
      throw new Error('Invalid bech32 private key format');
    }
    const privateKeyBytes = bech32.bech32.fromWords(decoded.words);
    // Remove the first byte (flag), use only the last 32 bytes
    const rawSecretKey = Buffer.from(privateKeyBytes).slice(1);
    this.keypair = Ed25519Keypair.fromSecretKey(rawSecretKey);
    this.suiAddress.set(this.keypair.getPublicKey().toSuiAddress());
  }

  public async createPolicy(): Promise<string> {
    if (!this.keypair) {
      return '';
    }

    try {
      this.submissionProcessingService.displayInfo('Creating policy');
      const tx = new Transaction();
      tx.setGasBudget(10000000);

      tx.moveCall({
        target: `${this.pocConfig?.packageId}::seal_manager::create_access_policy`,
        arguments: [tx.pure.vector('address', [this.suiAddress() || '', this.pocConfig?.dlpWalletAddress || ''])],
      });

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        requestType: 'WaitForLocalExecution',
        options: {
          showEffects: true,
        },
      });

      const policyObjId = result?.effects?.created?.[0]?.reference?.objectId || '';

      if (!policyObjId) {
        throw new Error('Failed to create policy. Please try again.');
      }

      return policyObjId;
    } catch (err) {
      console.error('Failed to create policy', err);
      this.submissionProcessingService.displayError('Failed to create policy');
      throw new Error('Failed to create policy. Please try again.');
    }
  }

  public async getTelechat(): Promise<string> {
    try {
      this.submissionProcessingService.displayInfo('Getting chat info');
      const fileDto: fileDto = await this.telegramApiService.transformChatsToFileDto('');
      return JSON.stringify(fileDto);
    } catch (err) {
      console.error('Failed to get telechat', err);
      this.submissionProcessingService.displayError('Failed to get chat info');
      throw new Error('Failed to get telechat. Please try again.');
    }
  }

  public async saveEncryptedFileOnchain(fileId: string, policyObjId: string, metadata: IFileMetadata): Promise<string> {
    if (!this.keypair) {
      return '';
    }

    try {
      this.submissionProcessingService.displayInfo('Saving encrypted file');
      const tx = new Transaction();
      tx.setGasBudget(10000000);

      const metadataBytes = new Uint8Array(new TextEncoder().encode(JSON.stringify(metadata)));

      tx.moveCall({
        target: `${this.pocConfig?.packageId}::seal_manager::save_encrypted_file`,
        arguments: [tx.pure.vector('u8', fromHex(fileId)), tx.object(policyObjId), tx.pure.vector('u8', metadataBytes)],
      });

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        requestType: 'WaitForLocalExecution',
        options: {
          showEffects: true,
        },
      });

      const onChainFileObjId = result?.effects?.created?.[0]?.reference?.objectId || '';

      if (!onChainFileObjId) {
        throw new Error('Failed to save encrypted file onchain. Please try again.');
      }

      return onChainFileObjId;
    } catch (err) {
      this.submissionProcessingService.displayError('Failed to save encrypted file');
      console.error('Failed to save encrypted file onchain', err);
      throw new Error('Failed to save encrypted file onchain. Please try again.');
    }
  }

  public async processDataWithNautilus(blobId: string, onChainFileObjId: string, policyObjectId: string, threshold: number) {
    try {
      this.submissionProcessingService.displayInfo('Processing data');
      const processParams = {
        payload: {
          timeout_secs: 300,
          args: [blobId, onChainFileObjId, policyObjectId, String(threshold)],
        },
      };

      const response = await this.httpClient
        .post<IProcessDataRes>(`${this.pocConfig?.nautilusUrl}/process_data`, processParams)
        .pipe(
          timeout(TIMEOUT_MS.THREE_MINUTES),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              console.error('Request timed out after 45 seconds');
              this.submissionProcessingService.displayError('Request timed out. Please try again.');
              return throwError(() => new Error('Request timed out. Please try again.'));
            }
            return throwError(() => error);
          }),
        )
        .toPromise();

      if (!response) {
        throw new Error('No response received from Nautilus');
      }

      this.submissionProcessingService.displaySuccess('Processed done');
      this.submissionProcessingService.setProcessedData({
        walrusUrl: `${this.walrusConfig?.aggregatorUrl}/blobs/${response.data.blobId}`,
        unprocessedWalrusUrl: `${this.walrusConfig?.aggregatorUrl}/blobs/${blobId}`,
        unprocessedOnChainFileUrl: `${this.pocConfig?.suiScanUrl}/${onChainFileObjId}`,
        attestationUrl: `${this.pocConfig?.suiScanUrl}/${response.data.attestationObjId}`,
        onChainFileUrl: `${this.pocConfig?.suiScanUrl}/${response.data.onChainFileObjId}`,
        policyObjectUrl: `${this.pocConfig?.suiScanUrl}/${policyObjectId}`,
      });

      return response;
    } catch (err) {
      this.submissionProcessingService.displayError('Failed to process data');
      console.error('Failed to process data with nautilus', err);
      throw new Error('Failed to process data with nautilus. Please try again.');
    }
  }

  public async processDataWithWorker(blobId: string, onChainFileObjId: string, policyObjectId: string, threshold: number) {
    try {
      this.submissionProcessingService.displayInfo('Processing data');
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
              this.submissionProcessingService.displayError('Request timed out. Please try again.');
              return throwError(() => new Error('Request timed out. Please try again.'));
            }
            return throwError(() => error);
          }),
        )
        .toPromise();

      if (!response) {
        throw new Error('No response received from worker');
      }

      this.submissionProcessingService.displaySuccess('Your file has been submitted for processing. It’ll be ready in a few minutes!');
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
      this.submissionProcessingService.displayError('Oops! We couldn’t start processing your file. Please try again.');
      console.error('Failed to process data with worker', err);
      throw new Error('Failed to process data with worker. Please try again.');
    }
  }

  public async encryptData(policyObjId: string, teleChat: string) {
    try {
      this.submissionProcessingService.displayInfo('Encrypting data');
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
      this.submissionProcessingService.displayError('Failed to encrypt data');
      console.error('Failed to encrypt data', err);
      throw new Error('Failed to encrypt data. Please try again.');
    }
  }

  public async doSuiPoc() {
    const policyObjId = await this.createPolicy();
    const teleChat = await this.getTelechat();
    const encryptedBytes = await this.encryptData(policyObjId, teleChat);

    const walrusUploadRes = await this.walrusService.uploadFileToWalrus(new File([encryptedBytes], 'encryptedFile'));
    const blobId = walrusUploadRes.split('/').pop() || '';

    const metadata: IFileMetadata = {
      walrusUrl: walrusUploadRes,
      size: encryptedBytes.length,
    };

    const encryptedData = new Uint8Array(encryptedBytes);
    const encryptedObject = EncryptedObject.parse(encryptedData);
    const onChainFileObjId = await this.saveEncryptedFileOnchain(encryptedObject.id, policyObjId, metadata);

    const processDataRes = await this.processDataWithWorker(blobId, onChainFileObjId, policyObjId, this.pocConfig?.threshold || 2);
    console.log('🚀 ~ Nautilus Processed data:', processDataRes?.data);
  }

  public setSuiPrivateKey(suiPrivateKey: string) {
    this.suiPrivateKey.set(suiPrivateKey);
  }

  public getSuiPrivateKey(): string {
    return this.suiPrivateKey();  
  }
}
