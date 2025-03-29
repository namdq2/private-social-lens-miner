import { inject, Injectable, signal } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { SubmissionProcessingComponent } from '../components/submission-processing/submission-processing.component';
import { ERROR_MSG_GENERAL } from '../shared/constants';

@Injectable({
  providedIn: 'root',
})
export class SubmissionProcessingService {
  private readonly dialog: MatDialog = inject(MatDialog);

  public showCloudFlare = signal<boolean>(false);

  public showInfo = signal<boolean>(false);
  public showError = signal<boolean>(false);
  public showSuccess = signal<boolean>(false);
  public showFailure = signal<boolean>(false);

  public showInfoMessage = signal<string>('');
  public showErrorMessage = signal<string>('');
  public showSuccessMessage = signal<string>('');
  public showFailureMessage = signal<string>('');

  public successRewardsAmount = signal<string>('');

  public displayInfo(infoMessage: string) {
    this.showInfo.set(true);
    this.showInfoMessage.set(infoMessage);
    this.showError.set(false);
    this.showSuccess.set(false);
    this.showFailure.set(false);
  }

  public displayError(errorMessage: string) {
    this.showInfo.set(false);
    this.showError.set(true);
    this.showErrorMessage.set(errorMessage || ERROR_MSG_GENERAL);
    this.showSuccess.set(false);
    this.showFailure.set(false);
  }

  public displaySuccess(successMessage: string = '') {
    this.showInfo.set(false);
    this.showError.set(false);
    this.showSuccess.set(true);
    this.showSuccessMessage.set(successMessage);
    this.showFailure.set(false);
  }

  public displayFailure(failureMessage: string = '') {
    this.showInfo.set(false);
    this.showError.set(false);
    this.showSuccess.set(false);
    this.showFailure.set(true);
    this.showFailureMessage.set(failureMessage);
  }

  public resetState() {
    this.showInfo.set(false);
    this.showError.set(false);
    this.showSuccess.set(false);
    this.showFailure.set(false);

    this.showInfoMessage.set('');
    this.showErrorMessage.set('');
    this.showSuccessMessage.set('');
    this.showFailureMessage.set('');
  }

  public startProcessingState() {
    const matDialogConfig: MatDialogConfig = {
      disableClose: true,
      height: '600px',
      width: '700px'
    }
    this.dialog.open(
      SubmissionProcessingComponent,
      matDialogConfig
    );
  }

  public endProcessingState() {
    this.dialog.closeAll();
  }
}
