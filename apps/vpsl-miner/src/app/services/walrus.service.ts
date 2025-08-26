import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppConfigService } from './app-config.service';
import { firstValueFrom } from 'rxjs';

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      id: string;
      storedEpoch: number;
      blobId: string;
      size: number;
      erasureCodeType: string;
      certifiedEpoch: number;
      storage: {
        id: string;
        startEpoch: number;
        endEpoch: number;
        storageSize: number;
      };
    };
    resourceOperation: {
      RegisterFromScratch?: any;
      Extend?: any;
    };
  };
  alreadyCertified?: {
    blobId: string;
    event: {
      txDigest: string;
      eventSeq: string;
    };
    endEpoch: number;
  };
}

export interface WalrusUploadRelayResponse {
  id: string;
  blobId: string;
  blobObject: {
    id: {
      id: string;
    };
    registered_epoch: number;
    blob_id: string;
    size: string;
    encoding_type: number;
    certified_epoch: number | null;
    storage: {
      id: {
        id: string;
      };
      start_epoch: number;
      end_epoch: number;
      storage_size: string;
    };
    deletable: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class WalrusService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly httpClient: HttpClient = inject(HttpClient);

  constructor() {}

  /**
 * Upload a file to Walrus storage
 * @param encryptedData - The encrypted file data to upload
 * @returns Promise<string> - The URL to access the uploaded blob
 */
  public async uploadFileToWalrus(encryptedData: File): Promise<string> {
    try {
      if (!this.appConfigService.walrus) {
        throw new Error('Walrus configuration is not available');
      }
      
      return await this.uploadFileToWalrusViaRelay(encryptedData);
    } catch (error) {
      console.error('Walrus upload failed', error);
      throw new Error('Failed to upload encrypted data to Walrus storage. Please try again.');
    }
  }
  
  public async uploadFileToWalrusViaRelay(encryptedData: File): Promise<string> {
    try {
      const epochs = this.appConfigService.walrus!.epochs || 5;
      const relayUrl = this.appConfigService.relayApi!.baseUrl;

      const uploadUrl = `${relayUrl}/api/relay/walrus/upload`;

      const formData = new FormData();
      formData.append('file', encryptedData);
      formData.append('epochs', epochs.toString());
      
      const headers = new HttpHeaders({
        'x-api-key': this.appConfigService.relayApi!.apiKey || '',
      });

      const response = await firstValueFrom(this.httpClient.post<Array<WalrusUploadRelayResponse>>(uploadUrl, formData, { headers }));
      console.log('Walrus upload via relay response', response);

      if (!response || response.length === 0) {
        throw new Error('No response received from Walrus relay');
      }

      // Return the URL to access the blob
      const aggregatorUrl = this.appConfigService.walrus!.aggregatorUrl;
      return `${aggregatorUrl}/blobs/${response[0].blobId}`;
    } catch (error) {
      console.error('Walrus upload via relay failed', error);
      throw new Error('Failed to upload encrypted data to Walrus storage via relay. Please try again.');
    }
  }
  
  public async uploadFileToWalrusViaPublisher(encryptedData: File): Promise<string> {
    try {
      if (!this.appConfigService.walrus) {
        throw new Error('Walrus configuration is not available');
      }

      const publisherUrl = this.appConfigService.walrus.publisherUrl;
      const epochs = this.appConfigService.walrus.epochs || 5;

      // Prepare the upload URL with epochs parameter
      const uploadUrl = `${publisherUrl}/blobs?epochs=${epochs}`;

      // Prepare headers
      const headers = new HttpHeaders({
        'Content-Type': 'application/octet-stream',
      });

      // Upload the file using HTTP PUT
      const response = await firstValueFrom(this.httpClient.put<WalrusUploadResponse>(uploadUrl, encryptedData, { headers }));

      if (!response) {
        throw new Error('No response received from Walrus');
      }

      // Extract blob ID from response
      let blobId: string;
      if (response.newlyCreated) {
        blobId = response.newlyCreated.blobObject.blobId;
      } else if (response.alreadyCertified) {
        blobId = response.alreadyCertified.blobId;
      } else {
        throw new Error('Invalid response format from Walrus');
      }

      // Return the URL to access the blob
      const aggregatorUrl = this.appConfigService.walrus.aggregatorUrl;
      return `${aggregatorUrl}/blobs/${blobId}`;
    } catch (error) {
      console.error('Walrus upload failed', error);
      throw new Error('Failed to upload encrypted data to Walrus storage. Please try again.');
    }
  }

  /**
   * Download a blob from Walrus storage
   * @param blobId - The blob ID to download
   * @returns Promise<Blob> - The downloaded blob data
   */
  public async downloadBlobFromWalrus(blobId: string): Promise<Blob> {
    try {
      if (!this.appConfigService.walrus) {
        throw new Error('Walrus configuration is not available');
      }

      const aggregatorUrl = this.appConfigService.walrus.aggregatorUrl;
      const downloadUrl = `${aggregatorUrl}/blobs/${blobId}`;

      const response = await firstValueFrom(this.httpClient
        .get(downloadUrl, {
          responseType: 'blob',
        }));

      if (!response) {
        throw new Error('No response received from Walrus');
      }

      return response;
    } catch (error) {
      console.error('Walrus download failed', error);
      throw new Error('Failed to download data from Walrus storage. Please try again.');
    }
  }

  /**
   * Get blob info from Walrus storage
   * @param blobId - The blob ID to get info for
   * @returns Promise<any> - The blob information
   */
  public async getBlobInfo(blobId: string): Promise<any> {
    try {
      if (!this.appConfigService.walrus) {
        throw new Error('Walrus configuration is not available');
      }

      const aggregatorUrl = this.appConfigService.walrus.aggregatorUrl;
      const infoUrl = `${aggregatorUrl}/blobs/${blobId}/info`;

      const response = await firstValueFrom(this.httpClient.get(infoUrl));

      return response;
    } catch (error) {
      console.error('Walrus blob info failed', error);
      throw new Error('Failed to get blob info from Walrus storage. Please try again.');
    }
  }

  /**
   * Check if Walrus is configured and available
   * @returns boolean - True if Walrus is configured
   */
  public isWalrusAvailable(): boolean {
    return !!(this.appConfigService.walrus?.publisherUrl && this.appConfigService.walrus?.aggregatorUrl);
  }
}
