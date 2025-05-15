import axios from 'axios';
import { inject, Injectable, signal } from '@angular/core';
import { AppConfigService } from './app-config.service';
import { AddFileWithPermissionsDto, RelayTransactionResponse, RequestProofDto, RequestRewardDto } from '../models/relay';
import { Web3WalletService } from './web3-wallet.service';
import { ContractService } from './contract.service';
import { ethers, TransactionReceipt } from 'ethers';
import { SubmissionProcessingService } from './submission-processing.service';
import { ElectronIpcService } from './electron-ipc.service';

import DataRegistryImplementationABI from '../assets/contracts/DataRegistryImplementation.json';
import { ENCRYPTION_SEED, ERROR_MSG_GENERAL } from '../shared/constants';

@Injectable({
  providedIn: 'root',
})
export class RelayApiService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly contractService: ContractService = inject(ContractService);
  private readonly submissionProcessingService: SubmissionProcessingService = inject(SubmissionProcessingService);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);

  public currentSignature = signal<string>('');

  private readonly axiosInstance = axios.create({
    baseURL: this.appConfigService.relayApi?.baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  public async relayAddFileWithPermissions(encryptedKey: string, uploadedEncryptedFileUrl: string) {
    try {
      const addFileWithPermissionsResponse = await this.addFileWithPermissions(encryptedKey, uploadedEncryptedFileUrl);
      console.log('addFileWithPermissions response', addFileWithPermissionsResponse);
      if (addFileWithPermissionsResponse?.status !== 'success') {
        throw new Error('Failed to add file with permissions');
      }

      const transactionReceipt = await this.getTransactionData(addFileWithPermissionsResponse.transactionHash);
      const fileId = this.getFileId(transactionReceipt);
      const teeFee = await this.web3WalletService.teePoolContract['teeFee']();

      const contributionProofResponse = await this.requestContributionProof(fileId, teeFee);
      console.log('contributionProofResponse', contributionProofResponse);
      if (contributionProofResponse.status !== 'success') {
        throw new Error('Failed to request contribution proof');
      }

      const proofIndex = 1;
      await this.initiateRequestReward(fileId, proofIndex);

      console.log('Claim requested successfully');

      await this.web3WalletService.calculateBalance();
      this.submissionProcessingService.displaySuccess(`Your submission scored ${this.submissionProcessingService.successRewardsAmount()} VFSN`);
    } catch (err: any) {
      console.error('Error relayAddFileWithPermissions:', err);
      this.submissionProcessingService.displayError(ERROR_MSG_GENERAL);
    }
  }

  private async initiateRequestReward(fileId: number, proofIndex: number) {
    try {
      const jobIds = await this.contractService.fileJobIds(fileId);
      const latestJobId = jobIds[jobIds.length - 1] as number;
      console.log(`Latest JobID for FileID ${fileId}: ${latestJobId}`);

      const jobDetails = await this.contractService.getTeeDetails(latestJobId);
      console.log(`Job details retrieved for JobID ${latestJobId}`);
      console.log('Job Details:', jobDetails);

      console.log(`Preparing contribution proof request for TEE`);

      const proofInstruction = await this.web3WalletService.dlpContract['proofInstruction']();

      const requestBody: any = {
        file_id: fileId,
        job_id: latestJobId,
        encryption_key: this.currentSignature(),
        encryption_seed: ENCRYPTION_SEED,
        proof_url: proofInstruction,
      };

      console.log(`Sending contribution proof request to TEE`);
      const contributionProofResponse = await this.contractService.vanaRunProof(jobDetails.teeUrl, requestBody);
      console.log('contributionProofResponse', contributionProofResponse);

      const contributionProofData = await contributionProofResponse.json();
      const defaultFailureMsg = 'Failed to send TEE request to the node to begin the validation.';

      if (!contributionProofResponse.ok) {
        console.error(`TEE request failed: ${JSON.stringify(contributionProofData)}`);
        if (contributionProofResponse.status === 400) {
          // check for rejection error
          // not rejection error, throw error else continue flow
          // score retrieved from data registry - will show end result based on score
          if (
            !(
              contributionProofData.detail?.error?.code === 'PROOF_OF_CONTRIBUTION_ERROR' &&
              contributionProofData.detail?.error?.message === 'The given file did not meet the proof-of-contribution threshold'
            )
          ) {
            throw new Error(defaultFailureMsg);
          }
        } else {
          // if not 400, throw error
          throw new Error(defaultFailureMsg);
        }
      }

      this.electronIpcService.updateLastSubmissionTime();

      this.submissionProcessingService.displayInfo('Your data has been verified and attested. Claiming your reward');

      console.log('Contribution proof response:', contributionProofData);
      console.log(`Contribution proof response received from TEE. Requesting a reward...`);

      const fileProof = await this.web3WalletService.dataRegistryContract['fileProofs'](fileId, proofIndex);
      const score = Number(ethers.formatEther(fileProof[1][0].toString())); // formatEther - 18 arg
      console.log('score', score);
      if (score > 0) {
        const fileRewardsFactorUint256 = await this.web3WalletService.dlpContract['fileRewardFactor']();
        const fileRewardFactorDecimal = Number(ethers.formatEther(fileRewardsFactorUint256.toString())); // formatEther - 18 arg
        const rewards = (score * fileRewardFactorDecimal).toFixed(5);
        this.submissionProcessingService.successRewardsAmount.set(rewards);
        await this.requestReward(fileId, proofIndex);
      } else {
        this.submissionProcessingService.displayFailure('The score for your data submission was below the acceptable limit. No rewards were awarded.');
      }
    } catch (err: any) {
      this.submissionProcessingService.displayError(err);
      throw new Error(err);
    }
  }

  private async getTransactionData(transactionHash: string) {
    // Connect to the provider and get the transaction receipt
    let txn: TransactionReceipt | null;
    console.log('transactionHash', transactionHash);
    console.log('web3WalletService.rpcProvider', this.web3WalletService.rpcProvider);


    if (transactionHash) {
      console.log('getting transaction receipt');
      txn = await this.web3WalletService.rpcProvider.getTransactionReceipt(transactionHash);
      console.warn(`TXN Receipt: ${txn}`);
    } else {
      throw new Error('No transaction.');
    }

    if (!txn || txn.logs.length === 0) {
      throw new Error('No logs found in the transaction receipt');
    }
    console.log('Transaction receipt:', txn);

    return txn;
  }

  private getFileId(txn: TransactionReceipt) {
    const contractInterface = new ethers.Interface(DataRegistryImplementationABI.abi);

    console.log('txn.logs', txn.logs);

    const parsedLogs = txn.logs.map((log) => {
      return contractInterface.parseLog({
        topics: log.topics,
        data: log.data,
      });
    });

    console.log('parsedLogs', parsedLogs);

    const fileAddedLogs = parsedLogs.filter((log) => {
      return log?.name === 'FileAdded';
    });

    if (fileAddedLogs.length === 0) {
      throw new Error('No FileAdded event found in the transaction receipt');
    }

    if (fileAddedLogs.length > 1) {
      throw new Error('Multiple FileAdded events found in the transaction receipt');
    }

    const fileId = Number(fileAddedLogs[0]?.args['fileId']);

    if (!fileId) {
      throw new Error('FileId not found in the FileAdded event');
    }

    this.submissionProcessingService.displayInfo('Data has been added to the data registry');

    return fileId;
  }

  public async addFileWithPermissions(encryptedKey: string, uploadedEncryptedFileUrl: string) {
    this.submissionProcessingService.displayInfo('Data is being added to the data registry');
    const url = `${this.appConfigService.relayApi?.baseUrl}/api/relay/data-registry/add-file-with-permissions`;
    const requestBody: AddFileWithPermissionsDto = {
      url: uploadedEncryptedFileUrl,
      ownerAddress: this.web3WalletService.walletAddress(),
      permissions: [
        {
          account: this.appConfigService.vana?.dlpSmartContractAddress || '',
          key: encryptedKey,
        },
      ],
    };
    const response = await this.axiosInstance.post<RelayTransactionResponse>(url, requestBody);

    if (response.status === 201) {
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error('Failed to add file with permissions');
      }
    } else {
      throw new Error('Failed to add file with permissions');
    }
  }

  public async requestContributionProof(fileId: number, teeFee: bigint) {
    const url = `${this.appConfigService.relayApi?.baseUrl}/api/relay/tee-pool/request-contribution-proof`;
    const requestBody: RequestProofDto = {
      fileId,
      teeFee: teeFee.toString(),
    };

    const response = await this.axiosInstance.post<RelayTransactionResponse>(url, requestBody);
    this.submissionProcessingService.displayInfo(`Contribution proof job has been requested. Your data is being validated`);

    if (response.status === 201) {
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error('Failed to request contribution proof');
      }
    } else {
      throw new Error('Failed to request contribution proof');
    }
  }

  public async requestReward(fileId: number, proofIndex: number) {
    const url = `${this.appConfigService.relayApi?.baseUrl}/api/relay/dlp/request-reward`;
    const requestBody: RequestRewardDto = {
      fileId,
      proofIndex,
    };
    const response = await axios.post<RelayTransactionResponse>(url, requestBody);

    if (response.status === 201) {
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error('Failed to request reward');
      }
    } else {
      throw new Error('Failed to request reward');
    }
  }
}
