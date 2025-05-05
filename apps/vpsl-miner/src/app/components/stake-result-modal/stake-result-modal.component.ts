import { Component, inject, Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-stake-result-modal',
  standalone: false,
  templateUrl: './stake-result-modal.component.html',
  styleUrl: './stake-result-modal.component.scss',
})
export class StakeResultModalComponent {
  private readonly router: Router = inject(Router);

  constructor(
    public dialogRef: MatDialogRef<StakeResultModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isLoading: boolean; isSuccess: boolean; stakeAmount?: number; stakePeriod?: number, isUnstake?: boolean },
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  onViewStakes() {
    this.router.navigate(['/app/stake-records']);
  }
}
