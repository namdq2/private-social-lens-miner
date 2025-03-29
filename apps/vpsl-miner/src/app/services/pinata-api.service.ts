import { inject, Injectable, signal } from '@angular/core';
import { PinataSDK, PinResponse, UploadOptions } from 'pinata-web3';
import { AppConfigService } from './app-config.service';

@Injectable({
  providedIn: 'root',
})
export class PinataApiService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);

  public pinataSDK: PinataSDK;

  constructor() {
    this.pinataSDK = new PinataSDK({
      pinataJwt: this.appConfigService.pinata?.jwt,
      pinataGateway: this.appConfigService.pinata?.gatewayDomain,
    })
  }

  public async uploadFileToPinata(encryptedData: any) {
    const pinataUpload = (await this.submitPinataFile(encryptedData)) as PinResponse;
    if (pinataUpload) {
      // const fileUrl = retrieveFileUrl(pinataUpload);
      const fileUrl = `${this.appConfigService.pinata?.fileBaseUrl}/${
        pinataUpload.IpfsHash
      }`;
      return fileUrl;
    }
    return '';
  }

  private async submitPinataFile(encryptedData: any) {
    try {
      // Upload the File to Pinata
      const uploadOptions: UploadOptions = {
        // metadata: {}
      };
      const upload = await this.pinataSDK.upload.file(encryptedData, uploadOptions);
      return upload;
    } catch (error) {
      console.error('pinata upload failed', error);
      throw new Error(
        'Failed to upload encrypted data to off-chain storage. Please try again.'
      );
    }
  }

  private async retrieveFileUrl(pinataUpload: PinResponse) {
    const ipfsUrl = await this.pinataSDK.gateways.convert(pinataUpload.IpfsHash);
    return ipfsUrl;
  }
}
