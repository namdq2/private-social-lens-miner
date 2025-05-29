import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppConfigService } from './app-config.service';

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

      const publisherUrl = this.appConfigService.walrus.publisherUrl;
      const epochs = this.appConfigService.walrus.epochs || 5;
      
      // Prepare the upload URL with epochs parameter
      const uploadUrl = `${publisherUrl}/v1/blobs?epochs=${epochs}`;

      // Prepare headers
      const headers = new HttpHeaders({
        'Content-Type': 'application/octet-stream',
      });

      // Upload the file using HTTP PUT
      const response = await this.httpClient.put<WalrusUploadResponse>(
        uploadUrl,
        encryptedData,
        { headers }
      ).toPromise();

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
      return `${aggregatorUrl}/v1/blobs/${blobId}`;

    } catch (error) {
      console.error('Walrus upload failed', error);
      throw new Error(
        'Failed to upload encrypted data to Walrus storage. Please try again.'
      );
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
      const downloadUrl = `${aggregatorUrl}/v1/blobs/${blobId}`;

      const response = await this.httpClient.get(downloadUrl, {
        responseType: 'blob'
      }).toPromise();

      if (!response) {
        throw new Error('No response received from Walrus');
      }

      return response;

    } catch (error) {
      console.error('Walrus download failed', error);
      throw new Error(
        'Failed to download data from Walrus storage. Please try again.'
      );
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
      const infoUrl = `${aggregatorUrl}/v1/blobs/${blobId}/info`;

      const response = await this.httpClient.get(infoUrl).toPromise();

      return response;

    } catch (error) {
      console.error('Walrus blob info failed', error);
      throw new Error(
        'Failed to get blob info from Walrus storage. Please try again.'
      );
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