import { inject, Injectable, signal, WritableSignal } from '@angular/core';
// import { SubmissionProcessingService } from './submission-processing.service';
import { Web3WalletService } from './web3-wallet.service';
import { isElectron } from '../shared/helpers';
import { UPLOAD_INTERVAL_HOURS } from '../shared/constants';

declare const window: any;

@Injectable({
  providedIn: 'root',
})
export class ElectronIpcService {
  // private readonly submissionProcessingService: SubmissionProcessingService = inject(SubmissionProcessingService);
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);

  // private readonly LOCAL_STORAGE_UPLOAD_All_CHATS_KEY = 'uploadAllChats';
  // private readonly LOCAL_STORAGE_SUBMISSION_CHATS_LIST_KEY = 'submissionChatsList';

  public uploadFrequencyList = signal<Array<number>>([UPLOAD_INTERVAL_HOURS]);
  public uploadFrequency = signal<number>(UPLOAD_INTERVAL_HOURS);

  public walletAddress: WritableSignal<string> = this.web3WalletService.walletAddress;
  public encryptionKey: WritableSignal<string> = this.web3WalletService.encryptionKey;

  public isUploadAllChats = signal<boolean>(true);
  public selectedChatIdsList = signal<Array<number>>([]);
  public isBackgroundTaskEnabled = signal<boolean>(false);
  public lastSubmissionTime = signal<Date | null>(null);
  public nextSubmissionTime = signal<Date | null>(null);
  public isAutoLaunchEnabled = signal<boolean>(true);
  public minimizeToTray = signal<boolean>(true);

  constructor() {
    if (isElectron()) {
      this.doInitialisation();
    }
  }

  public async doInitialisation() {
    const walletAddress = await window.electron.getWalletAddress();
    console.log('init walletAddress', walletAddress);
    this.walletAddress.set(walletAddress);

    const encryptionKey = await window.electron.getEncryptionKey();
    console.log('init encryptionKey', encryptionKey);
    this.encryptionKey.set(encryptionKey);

    const isUploadAllChats = await window.electron.getUploadAllChats();
    console.log('init isUploadAllChats', isUploadAllChats);
    this.isUploadAllChats.set(isUploadAllChats);

    const selectedChatIdsList = await window.electron.getSelectedChatIdsList();
    console.log('init selectedChatIdsList', selectedChatIdsList);
    this.selectedChatIdsList.set(selectedChatIdsList);

    const isBackgroundTaskEnabled = await window.electron.getEnableBackgroundTask();
    console.log('init isBackgroundTaskEnabled', isBackgroundTaskEnabled);
    this.isBackgroundTaskEnabled.set(isBackgroundTaskEnabled);

    const lastSubmissionTime = await window.electron.getLastSubmissionTime();
    console.log('init lastSubmissionTime', lastSubmissionTime);
    this.lastSubmissionTime.set(lastSubmissionTime);

    const nextSubmissionTime = await window.electron.getNextSubmissionTime();
    console.log('init nextSubmissionTime', nextSubmissionTime);
    this.nextSubmissionTime.set(nextSubmissionTime);

    const isAutoLaunchEnabled = await window.electron.getEnableAutoLaunch();
    console.log('init isAutoLaunchEnabled', isAutoLaunchEnabled);
    this.isAutoLaunchEnabled.set(isAutoLaunchEnabled);

    const minimizeToTray = await window.electron.getMinimizeToTray();
    console.log('init minimizeToTray', minimizeToTray);
    this.minimizeToTray.set(minimizeToTray);

    await this.web3WalletService.calculateBalance();
  }

  public setWalletAddress(value: string) {
    this.walletAddress.set(value);
    window.electron.setWalletAddress(this.walletAddress());
  }

  public setEncryptionKey(value: string) {
    this.encryptionKey.set(value);
    window.electron.setEncryptionKey(this.encryptionKey());
  }

  public setUploadAllChats(value: boolean) {
    this.isUploadAllChats.set(value);
    window.electron.setUploadAllChats(this.isUploadAllChats());
  }

  public setSelectedChatIdsList(value: Array<number>) {
    this.selectedChatIdsList.set(value);
    window.electron.setSelectedChatIdsList(this.selectedChatIdsList());
  }

  public startBackgroundTask() {
    window.electron.setEnableBackgroundTask(true);
    this.isBackgroundTaskEnabled.set(true);
    // this.submissionProcessingService.startProcessingState();
  }

  public stopBackgroundTask() {
    window.electron.setEnableBackgroundTask(false);
    this.isBackgroundTaskEnabled.set(false);
  }

  public updateLastSubmissionTime() {
    const lastSubmissionDate = new Date();
    this.lastSubmissionTime.set(lastSubmissionDate);
    window.electron.setLastSubmissionTime(lastSubmissionDate);
    this.updateNextSubmissionTime(lastSubmissionDate);
  }

  public updateNextSubmissionTime(lastSubmissionTime: Date) {
    const nextDate = new Date();
    // milliseconds: (4 hours * 60 min * 60 sec * 1000 ms) + (1 min * 60 sec * 1000 ms)
    // NOTE must match app.ts in electron app
    nextDate.setTime(lastSubmissionTime.getTime() + (UPLOAD_INTERVAL_HOURS * 60 * 60 * 1000) + (2 * 60 * 1000));

    this.nextSubmissionTime.set(nextDate);
    window.electron.setNextSubmissionTime(nextDate);
  }

  public enableAutoLaunch(value: boolean) {
    this.isAutoLaunchEnabled.set(value);
    window.electron.setEnableAutoLaunch(this.isAutoLaunchEnabled());
  }

  public setMinimizeToTray(value: boolean) {
    this.minimizeToTray.set(value);
    window.electron.setMinimizeToTray(this.minimizeToTray());
  }

  // public storeUploadFrequency(frequency: number) {
  //   localStorage.setItem(this.LOCAL_STORAGE_UPLOAD_FREQUENCY_KEY, frequency.toString());
  //   this.uploadFrequency.set(frequency);
  // }

  // public retrieveUploadFrequency(): number {
  //   const storedFrequency = Number(localStorage.getItem(this.LOCAL_STORAGE_UPLOAD_FREQUENCY_KEY));
  //   if (!isNaN(storedFrequency)) {
  //     return storedFrequency;
  //   }
  //   return 0;
  // }
}
