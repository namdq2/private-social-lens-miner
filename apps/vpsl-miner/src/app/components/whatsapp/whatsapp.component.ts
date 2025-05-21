import { Component, OnInit, WritableSignal } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { WhatsAppService } from '../../services/whatsapp.service';
import { WhatsAppIpcService } from '../../services/whatsapp-ipc.service';

@Component({
  selector: 'app-whatsapp',
  templateUrl: './whatsapp.component.html',
  styleUrls: ['./whatsapp.component.scss'],
  standalone: false,
})
export class WhatsAppComponent implements OnInit {
  public uploadFrequencyList = [4, 6, 8, 12, 24];
  public selectedFrequency: WritableSignal<number>;
  public isUploadAllChats: WritableSignal<boolean>;
  public isConnected = false;
  public selectedChatsCount = 0;

  constructor(private readonly whatsAppService: WhatsAppService, private readonly whatsAppIpcService: WhatsAppIpcService) {
    this.selectedFrequency = this.whatsAppIpcService.uploadWhatsappFrequency;
    this.isUploadAllChats = this.whatsAppIpcService.isUploadAllWhatsappChats;
  }

  ngOnInit(): void {
    this.whatsAppService.isConnected$.subscribe((isConnected) => (this.isConnected = isConnected));

    this.whatsAppService.chats$.subscribe((chats) => {
      this.selectedChatsCount = chats.filter((chat) => chat.selected).length;
    });
  }

  public onUploadAllChatsChange(matSlideToggleChange: MatSlideToggleChange) {
    this.whatsAppIpcService.setUploadAllWhatsappChats(matSlideToggleChange.checked);
    if (matSlideToggleChange.checked) {

      const fullDialogList = [...this.whatsAppService.chats()];
      this.whatsAppService.selectedChats.set(fullDialogList);
    }
    else {
      this.whatsAppService.selectedChats.set([]);
    }
  }

  public selectFrequency(freqItem: number) {
    this.whatsAppIpcService.setUploadWhatsappFrequency(freqItem);
    this.whatsAppIpcService.updateWhatsappNextSubmissionTime();
  }

  async submitSelectedChats(): Promise<void> {
    await this.whatsAppService.doWhatsappSubmission('');
    this.whatsAppService.clearSelection();
    console.log('Submitting selected WhatsApp chats', this.whatsAppService.transformChatsToFileDto(''));
  }

  async logout(): Promise<void> {
    await this.whatsAppService.logout();
  }
}
