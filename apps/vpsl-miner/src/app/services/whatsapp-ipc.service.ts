import { Injectable, signal } from '@angular/core';
import { isElectron } from '../shared/helpers';

// Declare the window interface to access the API from Electron
declare const window: any;

@Injectable({
  providedIn: 'root',
})
export class WhatsAppIpcService {
  public isUploadAllWhatsappChats = signal<boolean>(true);
  public selectedWhatsappChatIdsList = signal<Array<string>>([]);
  public isBackgroundWhatsappTaskEnabled = signal<boolean>(false);
  public lastWhatsappSubmissionTime = signal<Date | null>(null);
  public nextWhatsappSubmissionTime = signal<Date | null>(null);
  public backgroundWhatsappTaskIntervalExists = signal<boolean>(false);
  public uploadWhatsappFrequency = signal<number>(4);


  constructor(
  ) {
    if (isElectron()) {
      this.doInitialisation();
    }
  }

  public async doInitialisation() {
    const isUploadAllWhatsappChats = await window.whatsappAPI.getUploadAllWhatsappChats();
    console.log('init isUploadAllWhatsappChats', isUploadAllWhatsappChats);
    this.isUploadAllWhatsappChats.set(isUploadAllWhatsappChats);

    const selectedWhatsappChatIdsList = await window.whatsappAPI.getSelectedWhatsappChatIdsList();
    console.log('init selectedWhatsappChatIdsList', selectedWhatsappChatIdsList);
    this.selectedWhatsappChatIdsList.set(selectedWhatsappChatIdsList);

    const isBackgroundWhatsappTaskEnabled = await window.whatsappAPI.getEnableBackgroundWhatsappTask();
    console.log('init isBackgroundWhatsappTaskEnabled', isBackgroundWhatsappTaskEnabled);
    this.isBackgroundWhatsappTaskEnabled.set(isBackgroundWhatsappTaskEnabled);

    const lastWhatsappSubmissionTime = await window.whatsappAPI.getLastWhatsappSubmissionTime();
    console.log('init lastWhatsappSubmissionTime', lastWhatsappSubmissionTime);
    this.lastWhatsappSubmissionTime.set(lastWhatsappSubmissionTime);

    const nextWhatsappSubmissionTime = await window.whatsappAPI.getNextWhatsappSubmissionTime();
    console.log('init nextWhatsappSubmissionTime', nextWhatsappSubmissionTime);
    this.nextWhatsappSubmissionTime.set(nextWhatsappSubmissionTime);

    const backgroundWhatsappTaskIntervalExists = await window.whatsappAPI.getBackgroundWhatsappTaskIntervalExists();
    console.log('init backgroundWhatsappTaskIntervalExists', backgroundWhatsappTaskIntervalExists);
    this.backgroundWhatsappTaskIntervalExists.set(backgroundWhatsappTaskIntervalExists);

    const uploadWhatsappFrequency = await window.whatsappAPI.getUploadWhatsappFrequency();
    console.log('init uploadWhatsappFrequency', uploadWhatsappFrequency);
    this.uploadWhatsappFrequency.set(uploadWhatsappFrequency);
  }

  public setUploadAllWhatsappChats(value: boolean) {
    this.isUploadAllWhatsappChats.set(value);
    window.whatsappAPI.setUploadAllWhatsappChats(this.isUploadAllWhatsappChats());
  }

  public setSelectedWhatsappChatIdsList(value: Array<string>) {
    this.selectedWhatsappChatIdsList.set(value);
    window.whatsappAPI.setSelectedWhatsappChatIdsList(this.selectedWhatsappChatIdsList());
  }

  public startBackgroundWhatsappTask() {
    window.whatsappAPI.setEnableBackgroundWhatsappTask(true);
    this.isBackgroundWhatsappTaskEnabled.set(true);
  }

  public stopBackgroundWhatsappTask() {
    window.whatsappAPI.setEnableBackgroundWhatsappTask(false);
    this.isBackgroundWhatsappTaskEnabled.set(false);
  }

  public updateWhatsappLastSubmissionTime() {
    const lastWhatsappSubmissionDate = new Date();
    this.lastWhatsappSubmissionTime.set(lastWhatsappSubmissionDate);
    window.whatsappAPI.setLastWhatsappSubmissionTime(lastWhatsappSubmissionDate);
    this.updateWhatsappNextSubmissionTime();
  }

  public updateWhatsappNextSubmissionTime() {
    const lastWhatsappSubmissionTime = this.lastWhatsappSubmissionTime();
    if (lastWhatsappSubmissionTime) {
      const nextDate = new Date();
      nextDate.setTime(new Date(lastWhatsappSubmissionTime).getTime() + this.uploadWhatsappFrequency() * 60 * 60 * 1000);

      this.nextWhatsappSubmissionTime.set(nextDate);
      window.whatsappAPI.setNextWhatsappSubmissionTime(nextDate);
    }
  }

  public setUploadWhatsappFrequency(value: number) {
    this.uploadWhatsappFrequency.set(value);
    window.whatsappAPI.setUploadWhatsappFrequency(this.uploadWhatsappFrequency());
  }
}
