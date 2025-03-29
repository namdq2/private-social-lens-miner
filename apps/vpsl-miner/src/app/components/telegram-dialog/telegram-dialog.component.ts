import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Dialog } from 'telegram/tl/custom/dialog';

@Component({
  selector: 'app-telegram-dialog',
  standalone: false,
  templateUrl: './telegram-dialog.component.html',
  styleUrl: './telegram-dialog.component.scss',
})
export class TelegramDialogComponent {
  @Input() dialog: Dialog | null = null;
  @Input() selectedDialogId: bigInt.BigInteger | undefined;
  @Input() selectedDialogsList = signal<Array<Dialog>>([]);

  public readonly isDialogSelected = computed(() => {
    const selectedList = this.selectedDialogsList();
    const foundItem = selectedList.find(telegramDialog => telegramDialog.id === this.dialog?.id);
    return (foundItem != null);
  });

  @Output() dialogSelected: EventEmitter<Dialog | null> = new EventEmitter<Dialog | null>();
  @Output() addDialog: EventEmitter<Dialog | null> = new EventEmitter<Dialog | null>();
  @Output() removeDialog: EventEmitter<Dialog | null> = new EventEmitter<Dialog | null>();

  public selectDialog() {
    this.dialogSelected.emit(this.dialog);
  }

  public addOrRemoveDialog(matCheckboxChange: MatCheckboxChange) {
    if (matCheckboxChange.checked) {
      this.addDialog.emit(this.dialog);
    }
    else {
      this.removeDialog.emit(this.dialog);
    }
  }
}
