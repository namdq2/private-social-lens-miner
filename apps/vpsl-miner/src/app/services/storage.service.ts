import { inject, Injectable } from '@angular/core';
import { PinataApiService } from './pinata-api.service';
import { WalrusService } from './walrus.service';
import { AppConfigService } from './app-config.service';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly pinataApiService: PinataApiService = inject(PinataApiService);
  private readonly walrusService: WalrusService = inject(WalrusService);

  constructor() {}

  /**
   * Upload a file to the configured storage service (Walrus or Pinata)
   * @param encryptedData - The encrypted file data to upload
   * @returns Promise<string> - The URL to access the uploaded file
   */
  public async uploadFile(encryptedData: File): Promise<string> {
    try {
      // Prefer Walrus if configured, fallback to Pinata
      if (this.walrusService.isWalrusAvailable()) {
        console.log('Using Walrus for file upload');
        return await this.walrusService.uploadFileToWalrus(encryptedData);
      } else if (this.appConfigService.pinata) {
        console.log('Using Pinata for file upload');
        return await this.pinataApiService.uploadFileToPinata(encryptedData);
      } else {
        throw new Error('No storage service is configured. Please configure either Walrus or Pinata.');
      }
    } catch (error) {
      console.error('Storage upload failed', error);
      throw error;
    }
  }

  /**
   * Download a file from the storage service
   * @param fileUrl - The URL or blob ID of the file to download
   * @returns Promise<Blob> - The downloaded file data
   */
  public async downloadFile(fileUrl: string): Promise<Blob> {
    try {
      // Determine if this is a Walrus blob ID or a regular URL
      if (this.isWalrusBlobUrl(fileUrl)) {
        const blobId = this.extractBlobIdFromUrl(fileUrl);
        return await this.walrusService.downloadBlobFromWalrus(blobId);
      } else {
        // For Pinata or other HTTP URLs, use regular HTTP GET
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
        return await response.blob();
      }
    } catch (error) {
      console.error('Storage download failed', error);
      throw error;
    }
  }

  /**
   * Get the current storage service being used
   * @returns string - The name of the storage service
   */
  public getCurrentStorageService(): string {
    if (this.walrusService.isWalrusAvailable()) {
      return 'Walrus';
    } else if (this.appConfigService.pinata) {
      return 'Pinata';
    } else {
      return 'None';
    }
  }

  /**
   * Check if a URL is a Walrus blob URL
   * @param url - The URL to check
   * @returns boolean - True if it's a Walrus blob URL
   */
  private isWalrusBlobUrl(url: string): boolean {
    return url.includes('/v1/blobs/') && this.walrusService.isWalrusAvailable();
  }

  /**
   * Extract blob ID from a Walrus URL
   * @param url - The Walrus blob URL
   * @returns string - The blob ID
   */
  private extractBlobIdFromUrl(url: string): string {
    const match = url.match(/\/v1\/blobs\/([^/?]+)/);
    if (!match) {
      throw new Error('Invalid Walrus blob URL format');
    }
    return match[1];
  }

  /**
   * Get storage service status and configuration
   * @returns object - Status information about available storage services
   */
  public getStorageStatus() {
    return {
      walrus: {
        available: this.walrusService.isWalrusAvailable(),
        publisherUrl: this.appConfigService.walrus?.publisherUrl || null,
        aggregatorUrl: this.appConfigService.walrus?.aggregatorUrl || null,
        epochs: this.appConfigService.walrus?.epochs || null,
      },
      pinata: {
        available: !!this.appConfigService.pinata,
        configured: !!(this.appConfigService.pinata?.jwt && this.appConfigService.pinata?.gatewayDomain),
      },
      currentService: this.getCurrentStorageService(),
    };
  }
} 