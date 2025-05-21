import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { WhatsAppChat } from '../../services/whatsapp.service';

@Component({
  selector: 'app-whatsapp-chat',
  standalone: false,
  templateUrl: './whatsapp-chat.component.html',
  styleUrl: './whatsapp-chat.component.scss',
})
export class WhatsAppChatComponent {
  @Input() chat: WhatsAppChat | null = null;
  @Input() selectedChatId: string | undefined;
  @Input() selectedChats = signal<Array<WhatsAppChat>>([]);

  public readonly isChatSelected = computed(() => {
    const selectedList = this.selectedChats();
    const foundItem = selectedList.find(whatsappChat => whatsappChat.id === this.chat?.id);
    return (foundItem != null);
  });

  @Output() chatSelected: EventEmitter<WhatsAppChat | null> = new EventEmitter<WhatsAppChat | null>();
  @Output() addChat: EventEmitter<WhatsAppChat | null> = new EventEmitter<WhatsAppChat | null>();
  @Output() removeChat: EventEmitter<WhatsAppChat | null> = new EventEmitter<WhatsAppChat | null>();

  public selectChat() {
    this.chatSelected.emit(this.chat);
  }

  public addOrRemoveChat(matCheckboxChange: MatCheckboxChange) {
    if (matCheckboxChange.checked) {
      this.addChat.emit(this.chat);
    }
    else {
      this.removeChat.emit(this.chat);
    }
  }
}
