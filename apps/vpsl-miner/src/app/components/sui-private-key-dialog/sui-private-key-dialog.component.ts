import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { SuiPocService } from '../../services/sui-poc.service';

@Component({
  selector: 'app-sui-private-key-dialog',
  standalone: false,
  templateUrl: './sui-private-key-dialog.component.html',
  styleUrls: ['./sui-private-key-dialog.component.scss'],
})
export class SuiPrivateKeyDialogComponent {
  public privateKey: string = '';
  public errorMessage: string = '';

  constructor(private dialogRef: MatDialogRef<SuiPrivateKeyDialogComponent>, private suiPocService: SuiPocService) {}

  //on confirm
  public onConfirm(): boolean {
    this.errorMessage = '';

    // Check if private key is empty
    if (!this.privateKey || this.privateKey.trim() === '') {
      this.errorMessage = 'Private key is required';
      return false;
    }

    // Basic validation for Sui private key format
    // Sui private keys start with "suiprivkey" followed by alphanumeric characters
    const trimmedKey = this.privateKey.trim();

    // Check if it starts with "suiprivkey"
    if (!trimmedKey.startsWith('suiprivkey')) {
      this.errorMessage = 'Private key must start with "suiprivkey"';
      return false;
    }

    // Check if it contains only valid characters (alphanumeric)
    if (!/^[a-zA-Z0-9]+$/.test(trimmedKey)) {
      this.errorMessage = 'Private key must contain only alphanumeric characters';
      return false;
    }

    // Check minimum length (suiprivkey + some characters)
    if (trimmedKey.length < 20) {
      this.errorMessage = 'Private key appears to be too short';
      return false;
    }

    return true;
  }

  public onCancel(): void {
    this.privateKey = '';
    this.errorMessage = '';
    this.dialogRef.close(false);
  }

  public handleConfirm(): void {
    if (this.onConfirm()) {
      this.suiPocService.setSuiPrivateKey(this.privateKey.trim());
      this.dialogRef.close(true);
    }
  }

  public onInputChange(): void {
    // Clear error message when user starts typing
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }
}

