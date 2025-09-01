import { computed, inject, Injectable, signal } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { SubmissionProcessingComponent } from '../components/submission-processing/submission-processing.component';
import { ERROR_MSG_GENERAL, SUI_SUBMISSION_LOADING_MESSAGE } from '../shared/constants';
import { IProcessedData } from '../models/sui-poc';
import { SubmissionStatus } from '../shared/enum';

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
  public processedData = signal<IProcessedData | null>(null);
  public successRewardsAmount = signal<string>('');
  public vanaSubmissionStatus = signal<SubmissionStatus>(SubmissionStatus.NOT_DONE);
  public suiSubmissionStatus = signal<SubmissionStatus>(SubmissionStatus.NOT_DONE);
  public suiSubmissionErr = signal<string>('');
  public vanaSubmissionErr = signal<string>('');
  
  public isVanaSubmissionDone = computed(() => this.vanaSubmissionStatus() === SubmissionStatus.DONE);
  public isSuiSubmissionDone = computed(() => this.suiSubmissionStatus() === SubmissionStatus.DONE);
  public showProcessSuccess = computed(() => {
    const isDone = this.isSuiSubmissionDone() && this.isVanaSubmissionDone()
    const isSuccess = !this.suiSubmissionErr() || !this.vanaSubmissionErr()
    return isDone && isSuccess
  })
  public showProcessErr = computed(() => {
    const isDone = this.isSuiSubmissionDone() && this.isVanaSubmissionDone()
    const isFailed = this.suiSubmissionErr() && this.vanaSubmissionErr()
    return isDone && isFailed
  })

  public setVanaProcessErr(errMessage: string) {
    this.vanaSubmissionErr.set(errMessage)
    this.vanaSubmissionStatus.set(SubmissionStatus.DONE)
    if(this.suiSubmissionStatus() === SubmissionStatus.DONE) {
      this.showInfo.set(false);
    } else {
      this.displayInfo(SUI_SUBMISSION_LOADING_MESSAGE)
    }
  }

  public setSuiProcessErr(errMessage: string) {
    this.suiSubmissionErr.set(errMessage)
    this.suiSubmissionStatus.set(SubmissionStatus.DONE)
    if(this.vanaSubmissionStatus() === SubmissionStatus.DONE) {
      this.showInfo.set(false);
    }
  }

  public resetProcessState() {
    this.vanaSubmissionStatus.set(SubmissionStatus.NOT_DONE)
    this.suiSubmissionStatus.set(SubmissionStatus.NOT_DONE)
    this.suiSubmissionErr.set('')
    this.vanaSubmissionErr.set('')
    this.successRewardsAmount.set('')
  }

  public setSuiProcessDone() {
    this.suiSubmissionStatus.set(SubmissionStatus.DONE)
    if(this.vanaSubmissionStatus() === SubmissionStatus.DONE) {
      this.showInfo.set(false);
    }
  }

  public setVanaProcessDone(successMessage: string ) {
    this.vanaSubmissionStatus.set(SubmissionStatus.DONE)
    this.showSuccessMessage.set(successMessage);

    if(this.suiSubmissionStatus() === SubmissionStatus.DONE) {
      this.showInfo.set(false);
      this.showError.set(false);
      this.showFailure.set(false);
    } else {
      this.displayInfo(SUI_SUBMISSION_LOADING_MESSAGE)
    }
  }

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

  public setProcessedData(data: IProcessedData) {
    this.processedData.set(data);
  }

  public startProcessingState() {
    const matDialogConfig: MatDialogConfig = {
      disableClose: true,
      minHeight: '400px',
      height: 'auto',
      width: '700px',
    };
    this.dialog.open(SubmissionProcessingComponent, matDialogConfig);
  }

  public endProcessingState() {
    this.dialog.closeAll();
  }
}
