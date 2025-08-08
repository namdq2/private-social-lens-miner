import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import { ReferralService } from '../../services/referral.service';

@Component({
  selector: 'app-referral-rewards-dialog',
  standalone: false,
  templateUrl: './referral-rewards-dialog.component.html',
  styleUrl: './referral-rewards-dialog.component.scss',
})
export class ReferralRewardsDialogComponent {
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly clipboard: Clipboard = inject(Clipboard);
  private readonly referralService: ReferralService = inject(ReferralService);

  public get referralCode() {
    return this.referralService.userReferralCode();
  }

  public get referralLink() {
    return `https://vana.genesis.dfusion.ai?r=${this.referralCode}`
  }

  public copyReferralCode() {
    if (!this.referralCode) {
      return;
    }

    this.clipboard.copy(this.referralCode);

    this.snackBar.open(
      `Copied`,
      ``,
      { duration: 1000 * 2 }
    );
  }

  public copyReferralLink() {
    if (!this.referralCode) {
      return;
    }

    this.clipboard.copy(this.referralLink);

    this.snackBar.open(
      `Copied`,
      ``,
      { duration: 1000 * 2 }
    );
  }
}
