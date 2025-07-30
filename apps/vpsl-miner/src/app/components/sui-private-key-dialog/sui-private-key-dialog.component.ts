import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SuiPocService } from '../../services/sui-poc.service';

export interface SuiPrivateKeyDialogData {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-sui-private-key-dialog',
  templateUrl: './sui-private-key-dialog.component.html',
  styleUrls: ['./sui-private-key-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule],
})
export class SuiPrivateKeyDialogComponent {
  public privateKey: string = '';

  constructor(
    private suiPocService: SuiPocService,
    public dialogRef: MatDialogRef<SuiPrivateKeyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SuiPrivateKeyDialogData,
  ) {}

  onConfirm(): void {
    if (this.privateKey.trim()) {
      this.dialogRef.close();
      this.suiPocService.setSuiPrivateKey(this.privateKey.trim());
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  isFormValid(): boolean {
    return this.privateKey.trim().length > 0;
  }
} 