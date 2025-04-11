import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Web3WalletService } from './web3-wallet.service';
import { isElectron } from '../shared/helpers';

declare const window: any;

@Injectable({
  providedIn: 'root',
})
export class ElectronIpcService {
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);

  public walletAddress: WritableSignal<string> = this.web3WalletService.walletAddress;
  public encryptionKey: WritableSignal<string> = this.web3WalletService.encryptionKey;

  public isUploadAllChats = signal<boolean>(true);
  public selectedChatIdsList = signal<Array<number>>([]);
  public isBackgroundTaskEnabled = signal<boolean>(false);
  public lastSubmissionTime = signal<Date | null>(null);
  public nextSubmissionTime = signal<Date | null>(null);
  public isAutoLaunchEnabled = signal<boolean>(true);
  public minimizeToTray = signal<boolean>(true);
  public backgroundTaskIntervalExists = signal<boolean>(false);
  public uploadFrequency = signal<number>(4);

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

    const backgroundTaskIntervalExists = await window.electron.getBackgroundTaskIntervalExists();
    console.log('init backgroundTaskIntervalExists', backgroundTaskIntervalExists);
    this.backgroundTaskIntervalExists.set(backgroundTaskIntervalExists);

    const uploadFrequency = await window.electron.getUploadFrequency();
    console.log('init uploadFrequency', uploadFrequency);
    this.uploadFrequency.set(uploadFrequency);

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
    this.updateNextSubmissionTime();
  }

  public updateNextSubmissionTime() {
    const lastSubmissionTime = this.lastSubmissionTime();
    if (lastSubmissionTime) {
      const nextDate = new Date();
      nextDate.setTime(new Date(lastSubmissionTime).getTime() + (this.uploadFrequency() * 60 * 60 * 1000));

      this.nextSubmissionTime.set(nextDate);
      window.electron.setNextSubmissionTime(nextDate);
    }
  }

  public enableAutoLaunch(value: boolean) {
    this.isAutoLaunchEnabled.set(value);
    window.electron.setEnableAutoLaunch(this.isAutoLaunchEnabled());
  }

  public setMinimizeToTray(value: boolean) {
    this.minimizeToTray.set(value);
    window.electron.setMinimizeToTray(this.minimizeToTray());
  }

  public setUploadFrequency(value: number) {
    this.uploadFrequency.set(value);
    window.electron.setUploadFrequency(this.uploadFrequency());
  }
}
