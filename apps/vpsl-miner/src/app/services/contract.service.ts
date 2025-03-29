import { inject, Injectable } from '@angular/core';
import { Web3WalletService } from './web3-wallet.service';


@Injectable({
  providedIn: 'root',
})
export class ContractService {
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);

  public async vanaRunProof(teeUrl: string, requestBody: any) {
    try {
      const response = await fetch(`${teeUrl}/RunProof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      return response;
    } catch (err) {
      console.error(`${teeUrl}/RunProof request failed`, err);
      throw new Error('Failed to run proof of contribution.');
    }
  }

  public async fileJobIds(fileId: number) {
    try {
      const jobIds = await this.web3WalletService.teePoolContract['fileJobIds'](fileId as any);
      return jobIds.map(Number);
    } catch (error) {
      console.error('Error fetching file job IDs:', error);
      throw error;
    }
  }

  public async getTeeDetails(jobId: number) {
    try {
      const job = (await this.web3WalletService.teePoolContract['jobs'](jobId as any)) as any;
      const teeInfo = await this.web3WalletService.teePoolContract['tees'](job.teeAddress);

      return { ...job, teeUrl: teeInfo.url, teePublicKey: teeInfo.publicKey };
    } catch (error) {
      console.error('Error fetching job details:', error);
      throw error;
    }
  }
}
