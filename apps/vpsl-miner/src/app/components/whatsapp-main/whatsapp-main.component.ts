import { AfterViewInit, Component, computed, inject, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WhatsAppChat, WhatsAppMessage, WhatsAppService } from '../../services/whatsapp.service';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { WhatsAppIpcService } from '../../services/whatsapp-ipc.service';

@Component({
  selector: 'app-whatsapp-main',
  standalone: false,
  templateUrl: './whatsapp-main.component.html',
  styleUrl: './whatsapp-main.component.scss',
})
export class WhatsAppMainComponent implements AfterViewInit {
  private readonly whatsappService: WhatsAppService = inject(WhatsAppService);
  private readonly whatsAppIpcService: WhatsAppIpcService = inject(WhatsAppIpcService);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly matDialog: MatDialog = inject(MatDialog);

  public isBackgroundWhatsappTaskEnabled: WritableSignal<boolean>;
  public lastWhatsappSubmissionTime: WritableSignal<Date | null>;
  public nextWhatsappSubmissionTime: WritableSignal<Date | null>;

  public chats: WritableSignal<WhatsAppChat[]> = this.whatsappService.chats;
  public selectedChat: WhatsAppChat | null = null;
  public selectedMessages: WhatsAppMessage[] = [];
  public selectedChats: WritableSignal<WhatsAppChat[]> = this.whatsappService.selectedChats;

  public readonly isAllChatsSelected = computed(() => {
    const selectedList = this.selectedChats();
    const totalList = this.whatsappService.chats;
    return selectedList.length === totalList.length;
  });

  public readonly lastSubmissionTimeString = computed(() => {
    const lastSubmissionTime = this.lastWhatsappSubmissionTime();
    if (lastSubmissionTime) {
      const lastSubmissionDate = new Date(lastSubmissionTime);
      return `${lastSubmissionDate.toLocaleDateString()}, ${lastSubmissionDate.toLocaleTimeString()}`;
    } else {
      return '';
    }
  });

  public readonly nextSubmissionTimeString = computed(() => {
    const nextSubmissionTime = this.nextWhatsappSubmissionTime();
    if (nextSubmissionTime) {
      const nextSubmissionDate = new Date(nextSubmissionTime);
      return `${nextSubmissionDate.toLocaleDateString()}, ${nextSubmissionDate.toLocaleTimeString()}`;
    } else {
      return '';
    }
  });

  constructor() {
    this.isBackgroundWhatsappTaskEnabled = this.whatsAppIpcService.isBackgroundWhatsappTaskEnabled;
    this.lastWhatsappSubmissionTime = this.whatsAppIpcService.lastWhatsappSubmissionTime;
    this.nextWhatsappSubmissionTime = this.whatsAppIpcService.nextWhatsappSubmissionTime;
  }

  public ngAfterViewInit(): void {
    if (this.isBackgroundWhatsappTaskEnabled() && !this.whatsAppIpcService.backgroundWhatsappTaskIntervalExists()) {
      this.whatsAppIpcService.startBackgroundWhatsappTask();
    }
  }

  public async refresh() {
    this.whatsappService.initialisePreSelectedChats();
  }

  public async onChatSelected(chat: WhatsAppChat | null) {
    if (!chat) {
      console.error('NULL CHAT!');
      return;
    }

    console.log('onChatSelected', chat);
    this.selectedChat = chat;
    const messages = await this.whatsappService.loadMessages(chat.id);
    if (messages) {
      this.selectedMessages = messages;
    }
  }

  public selectAllChats(matCheckboxChange: MatCheckboxChange) {
    if (matCheckboxChange.checked) {
      const fullChatList = [...this.whatsappService.chats()];
      this.selectedChats.set(fullChatList);
    } else {
      this.selectedChats.set([]);
    }
  }

  public onAddChat(chat: WhatsAppChat | null) {
    if (chat) {
      const existingChat = this.selectedChats().find((chat) => chat.id === chat.id);
      if (!existingChat) {
        this.selectedChats().push(chat);
      } else {
        console.error('CHAT ALREADY IN LIST');
      }
    } else {
      console.error('NULL CHAT!');
    }
  }

  public onRemoveChat(chat: WhatsAppChat | null) {
    const chatIndex = this.selectedChats().findIndex((chat) => chat.id === chat?.id);
    if (chatIndex !== -1) {
      this.selectedChats().splice(chatIndex, 1);
    }
  }

  public async doSubmit() {
    this.startBackgroundTask();
  }

  public startBackgroundTask() {
    if (this.selectedChats().length > 0 || this.whatsAppIpcService.isUploadAllWhatsappChats()) {
      this.whatsAppIpcService.startBackgroundWhatsappTask();
    } else {
      this.snackBar.open(`Select at least one chat`, `OK`, { duration: 1000 * 2 });
    }
  }

  public stopBackgroundWhatsappTask() {
    const dialogRef = this.matDialog.open(ConfirmDialogComponent, {
      data: null,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.whatsAppIpcService.stopBackgroundWhatsappTask();
      }
    });
  }
}
