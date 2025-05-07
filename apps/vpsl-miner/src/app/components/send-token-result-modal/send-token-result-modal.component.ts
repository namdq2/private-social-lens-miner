import { Component, Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TokenTransferType } from '../../models/token-transfer';

@Component({
  selector: 'app-send-token-result-modal',
  standalone: false,
  templateUrl: './send-token-result-modal.component.html',
  styleUrl: './send-token-result-modal.component.scss',
})
export class SendTokenResultModalComponent {
  public TokenTransferType = TokenTransferType;

  constructor(
    public dialogRef: MatDialogRef<SendTokenResultModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isLoading: boolean; isSuccess: boolean; tokenTransferType: TokenTransferType, errMessage?: string },
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
