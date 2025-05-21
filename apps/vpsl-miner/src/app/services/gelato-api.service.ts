import { inject, Injectable, signal } from '@angular/core';
import { GelatoRelay, SponsoredCallRequest, TaskState, TransactionStatusResponse } from '@gelatonetwork/relay-sdk';
import { AppConfigService } from './app-config.service';
import { GelatoTaskRelay } from '../models/gelato';
import { Web3WalletService } from './web3-wallet.service';
import { ENCRYPTION_SEED, ERROR_MSG_GENERAL } from '../shared/constants';
import { ethers, TransactionReceipt } from 'ethers';
import { SubmissionProcessingService } from './submission-processing.service';
import { ContractService } from './contract.service';
import { ElectronIpcService } from './electron-ipc.service';

import DataRegistryImplementationABI from '../assets/contracts/DataRegistryImplementation.json';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppIpcService } from './whatsapp-ipc.service';

@Injectable({
  providedIn: 'root',
})
export class GelatoApiService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly submissionProcessingService: SubmissionProcessingService = inject(SubmissionProcessingService);
  private readonly contractService: ContractService = inject(ContractService);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  private readonly whatsappIpcService: WhatsAppIpcService = inject(WhatsAppIpcService);

  private gelatoRelay = new GelatoRelay();
  public currentTaskType = signal<GelatoTaskRelay>(GelatoTaskRelay.NONE);
  private currentSubmissionFileId = -1;
  public currentSignature = signal<string>('');
  public currentSocialType = signal<string>('');

  constructor() {
    this.gelatoRelay.onTaskStatusUpdate(async (taskStatus: TransactionStatusResponse) => {
      console.warn(`Gelato task status update ${this.currentTaskType()}:`, taskStatus);
      switch (taskStatus.taskState) {
        case TaskState.ExecSuccess:
          await this.handleGelatoTaskSuccess(taskStatus.transactionHash);
          break;
        case TaskState.ExecReverted:
        case TaskState.Cancelled:
          this.handleGelatoTaskError(taskStatus.lastCheckMessage);
          break;
        default:
          break;
      }
    });
  }

  public async relayAddFileWithPermissions(encryptedKey: string, uploadedEncryptedFileUrl: string) {
    try {
      const permissions = [
        {
          account: this.appConfigService.vana?.dlpSmartContractAddress,
          key: encryptedKey,
        },
      ];

      // this requires end user to approve
      const { data } = await this.web3WalletService.dataRegistryContract['addFileWithPermissions'].populateTransaction(
        uploadedEncryptedFileUrl,
        this.web3WalletService.walletAddress(), // address of the owner
        permissions,
      );

      const sponsoredCallRequest: SponsoredCallRequest = {
        chainId: (await this.web3WalletService.rpcProvider.getNetwork()).chainId,
        target: this.appConfigService.vana?.dataRegistrySmartContractAddress as string,
        data: data,
      };
      // console.log('sponsoredCallRequest', sponsoredCallRequest);
      this.currentTaskType.set(GelatoTaskRelay.ADD_FILE_WITH_PERMISSION);
      const relayResponse = await this.gelatoRelay.sponsoredCall(sponsoredCallRequest, this.appConfigService.gelato!.apiKey);
      // console.log('relayAddFileWithPermissions response', relayResponse);
    } catch (error: any) {
      console.error('gelato relayAddFileWithPermissions', error);
      this.handleGelatoRelayError(error);
      throw new Error(ERROR_MSG_GENERAL);
    }
  }

  public async relayRequestContributionProof(teeFee: any) {
    try {
      const { data } = await this.web3WalletService.teePoolContract['requestContributionProof'].populateTransaction(this.currentSubmissionFileId, {
        value: teeFee,
      });

      const sponsoredCallRequest: SponsoredCallRequest = {
        chainId: (await this.web3WalletService.rpcProvider.getNetwork()).chainId,
        target: this.appConfigService.vana?.teePoolSmartContractAddress as string,
        data: data as any,
      };
      // console.log('sponsoredCallRequest', sponsoredCallRequest);
      this.currentTaskType.set(GelatoTaskRelay.REQUEST_CONTRIBUTION_PROOF);
      const relayResponse = await this.gelatoRelay.sponsoredCall(sponsoredCallRequest, this.appConfigService.gelato!.apiKey);
      // console.log('relayRequestContributionProof response', relayResponse);
    } catch (error: any) {
      console.error('gelato relayRequestContributionProof', error);
      this.handleGelatoRelayError(error);
      throw new Error(ERROR_MSG_GENERAL);
    }
  }

  public async relayRequestReward(proofIndex: number = 1) {
    try {
      const { data } = await this.web3WalletService.dlpContract['requestReward'].populateTransaction(this.currentSubmissionFileId, proofIndex);
      const sponsoredCallRequest: SponsoredCallRequest = {
        chainId: (await this.web3WalletService.rpcProvider.getNetwork()).chainId,
        target: this.appConfigService.vana!.dlpSmartContractAddress,
        data: data as any,
      };
      // console.log('SponsoredCallRequest', sponsoredCallRequest);
      this.currentTaskType.set(GelatoTaskRelay.REQUEST_REWARD);
      const relayResponse = await this.gelatoRelay.sponsoredCall(sponsoredCallRequest, this.appConfigService.gelato!.apiKey);
      // console.log('relayRequestReward response', relayResponse);
    } catch (error: any) {
      console.error('gelato relayRequestReward', error);
      this.handleGelatoRelayError(error);
      throw new Error(ERROR_MSG_GENERAL);
    }
  }

  private async handleGelatoTaskSuccess(transactionHash: string | undefined) {
    try {
      console.warn(`Gelato Transaction Hash: ${transactionHash}`);
      // Connect to the provider and get the transaction receipt
      let txn: TransactionReceipt | null;
      if (transactionHash) {
        txn = await this.web3WalletService.rpcProvider.getTransactionReceipt(transactionHash);
        console.warn(`TXN Receipt: ${txn}`);
      } else {
        throw new Error('No transaction.');
      }

      if (!txn || txn.logs.length === 0) {
        throw new Error('No logs found in the transaction receipt');
      }
      console.log('Transaction receipt:', txn);

      try {
        for (const log of txn.logs) {
          // Filter logs by contract address

          // task result for addFileWithPermissions
          if (log.address.toLowerCase() === this.appConfigService.vana?.dataRegistrySmartContractAddress.toLowerCase()) {
            await this.initiateContributionProofFlow(log);
          }

          // task result for requestContributionProof
          if (log.address.toLowerCase() === this.appConfigService.vana?.teePoolSmartContractAddress.toLowerCase()) {
            await this.initiateRequestReward();
          }

          // task result for requestReward
          if (log.address.toLowerCase() === this.appConfigService.vana?.dlpSmartContractAddress.toLowerCase()) {
            console.log('Claim requested successfully');
            // this.submissionProcessingService.resetState();
            await this.web3WalletService.calculateBalance();
            this.submissionProcessingService.displaySuccess(`Your submission scored ${this.submissionProcessingService.successRewardsAmount()} VFSN`);
          }
        }
      } catch (error: any) {
        this.submissionProcessingService.displayError(error);
      } finally {
        // setShowSpinner(false);
      }
    } catch (error) {
      console.error('Error handleGelatoTaskSuccess:', error);
      this.submissionProcessingService.displayError(ERROR_MSG_GENERAL);
    }
  }

  private async initiateContributionProofFlow(log: ethers.Log) {
    try {
      const contractInterface = new ethers.Interface(DataRegistryImplementationABI.abi);
      // Decode the log using the contract's ABI
      const parsedLog = contractInterface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      // Check if the event is `FileAdded`
      if (parsedLog?.name === 'FileAdded') {
        // Extract fileId from the event arguments
        this.currentSubmissionFileId = Number(parsedLog.args['fileId']); // Or `parsedLog.args[0]`
        console.log('Uploaded File ID:', this.currentSubmissionFileId);

        if (this.currentSubmissionFileId) {
          this.submissionProcessingService.displayInfo('Data has been added to the data registry');
          const teeFee = (await this.web3WalletService.teePoolContract['teeFee']()) as number;
          await this.relayRequestContributionProof(teeFee);
          this.submissionProcessingService.displayInfo(`Contribution proof job has been requested. Your data is being validated`);
        }
      }
    }
    catch(err: any) {
      throw new Error(err);
    }
  }

  private async initiateRequestReward() {
    try {
      const jobIds = await this.contractService.fileJobIds(this.currentSubmissionFileId);
      const latestJobId = jobIds[jobIds.length - 1] as number;
      console.log(`Latest JobID for FileID ${this.currentSubmissionFileId}: ${latestJobId}`);

      const jobDetails = await this.contractService.getTeeDetails(latestJobId);
      console.log(`Job details retrieved for JobID ${latestJobId}`);
      console.log('Job Details:', jobDetails);

      console.log(`Preparing contribution proof request for TEE`);

      const proofInstruction = await this.web3WalletService.dlpContract['proofInstruction']();

      const requestBody: any = {
        file_id: this.currentSubmissionFileId,
        job_id: latestJobId,
        encryption_key: this.currentSignature(),
        encryption_seed: ENCRYPTION_SEED,
        proof_url: proofInstruction,
      };

      console.log(`Sending contribution proof request to TEE`);
      const contributionProofResponse = await this.contractService.vanaRunProof(jobDetails.teeUrl, requestBody);
      // console.log('contributionProofResponse', contributionProofResponse);

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

      if (this.currentSocialType() === 'whatsapp') {
        this.whatsappIpcService.updateWhatsappLastSubmissionTime();
        this.currentSocialType.set(''); // reset social type
      } else {
        this.electronIpcService.updateLastSubmissionTime();
      }

      this.submissionProcessingService.displayInfo('Your data has been verified and attested. Claiming your reward');

      console.log('Contribution proof response:', contributionProofData);
      console.log(`Contribution proof response received from TEE. Requesting a reward...`);

      const fileProof = await this.web3WalletService.dataRegistryContract['fileProofs'](
        this.currentSubmissionFileId,
        1, // proofIndex
      );
      const score = Number(ethers.formatEther(fileProof[1][0].toString())); // formatEther - 18 arg
      console.log('score', score);
      if (score > 0) {
        const fileRewardsFactorUint256 = await this.web3WalletService.dlpContract['fileRewardFactor']();
        const fileRewardFactorDecimal = Number(ethers.formatEther(fileRewardsFactorUint256.toString())); // formatEther - 18 arg
        const rewards = (score * fileRewardFactorDecimal).toFixed(5);
        this.submissionProcessingService.successRewardsAmount.set(rewards);
        await this.relayRequestReward(); // proof index always 1
      } else {
        this.submissionProcessingService.displayFailure('The score for your data submission was below the acceptable limit. No rewards were awarded.')
      }
    }
    catch(err: any) {
      this.submissionProcessingService.displayError(err);
      throw new Error(err);
    }
  }

  private handleGelatoTaskError(errMsg: string | undefined) {
    console.error('Gelato task error', errMsg);

    switch (this.currentTaskType()) {
      case GelatoTaskRelay.REQUEST_REWARD:
        this.currentTaskType.set(GelatoTaskRelay.NONE);
        // this.submissionProcessingService.resetState();
        this.submissionProcessingService.displaySuccess();
        break;
      case GelatoTaskRelay.ADD_FILE_WITH_PERMISSION:
        this.submissionProcessingService.displayError('Failed to submit data to file registry. Please try again');
        break;
      case GelatoTaskRelay.REQUEST_CONTRIBUTION_PROOF:
        this.submissionProcessingService.displayError('Failed to request contribution proof job. Please try again.');
        break;
      default:
        this.submissionProcessingService.displayError(ERROR_MSG_GENERAL);
        break;
    }
  }

  private handleGelatoRelayError(error: any) {
    if (error.message.includes('insufficient funds')) {
      console.error('Relay service needs funding');
    } else if (error.message.includes('unauthorized')) {
      console.error('Invalid API key or unauthorized request');
    } else {
      console.error('Relay request failed:', error);
    }
  }
}
