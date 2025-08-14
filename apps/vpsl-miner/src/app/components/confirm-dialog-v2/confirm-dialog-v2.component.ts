import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  confirmButtonClass?: string;
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog-v2',
  templateUrl: './confirm-dialog-v2.component.html',
  styleUrls: ['./confirm-dialog-v2.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class ConfirmDialogV2Component {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogV2Component>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
