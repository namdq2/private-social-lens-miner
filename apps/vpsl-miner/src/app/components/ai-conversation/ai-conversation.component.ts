import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { IConversation } from '../../models/ai-chat';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogV2Component } from '../confirm-dialog-v2/confirm-dialog-v2.component';

@Component({
  selector: 'app-ai-conversation',
  standalone: false,
  templateUrl: './ai-conversation.component.html',
  styleUrl: './ai-conversation.component.scss',
})
export class AiConversationComponent {
  private readonly matDialog: MatDialog = inject(MatDialog);

  @Input() conversation!: IConversation;
  @Input() isSelected: boolean = false;
  @Input() disabled: boolean = false;
  @Input() isDeleting: boolean = false;

  @Output() conversationSelected = new EventEmitter<string>();
  @Output() conversationDeleted = new EventEmitter<string>();

  public onSelect(): void {
    if (!this.disabled) {
      this.conversationSelected.emit(this.conversation.id);
    }
  }

  public openConfirmDialog() {
    this.matDialog
      .open(ConfirmDialogV2Component, {
        data: {
          title: 'Delete conversation',
          message: 'Are you sure you want to delete this conversation?',
          confirmText: 'Delete',
          confirmButtonClass: 'dfus-orange-btn',
          icon: 'warning',
          disabledConfirm: this.disabled,
        },
        width: '400px',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result: boolean) => {
        if (result) {
          this.conversationDeleted.emit(this.conversation.id);
        }
      });
  }

  public getLastMessagePreview(): string {
    // Since IConversation doesn't have messages property, we'll return a default message
    // In a real implementation, you might want to fetch messages separately or modify the API response
    return 'New conversation';
  }

  public formatDate(date: Date | string): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;

    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}
