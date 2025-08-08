import { Component, inject } from '@angular/core';
import { GelatoTaskRelay } from '../../models/gelato';
import { GelatoApiService } from '../../services/gelato-api.service';
import { SubmissionProcessingService } from '../../services/submission-processing.service';
import { AppConfigService } from '../../services/app-config.service';

@Component({
  selector: 'app-submission-processing',
  standalone: false,
  templateUrl: './submission-processing.component.html',
  styleUrl: './submission-processing.component.scss',
})
export class SubmissionProcessingComponent {
  private readonly submissionProcessingService: SubmissionProcessingService = inject(SubmissionProcessingService);
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  public readonly suiScanUrl = this.appConfigService.suiPoc?.suiScanUrl;
  // private readonly cloudFlareService: CloudFlareService = inject(CloudFlareService);
  private readonly gelatoApiService: GelatoApiService = inject(GelatoApiService);

  public showCloudFlare = this.submissionProcessingService.showCloudFlare;

  public showInfo = this.submissionProcessingService.showInfo;
  public showError = this.submissionProcessingService.showError;
  public showSuccess = this.submissionProcessingService.showSuccess;
  public showFailure = this.submissionProcessingService.showFailure;

  public showInfoMessage = this.submissionProcessingService.showInfoMessage;
  public showErrorMessage = this.submissionProcessingService.showErrorMessage;
  public showSuccessMessage = this.submissionProcessingService.showSuccessMessage;
  public showFailureMessage = this.submissionProcessingService.showFailureMessage;
  public processedData = this.submissionProcessingService.processedData;

  public get gelatoTaskType() {
    return this.gelatoApiService.currentTaskType;
  }

  public readonly gelatoTaskTypeRequestReward = GelatoTaskRelay.REQUEST_REWARD;
  public readonly gelatoTaskTypeNone = GelatoTaskRelay.NONE;

  public endSubmissionFlow() {
    this.submissionProcessingService.resetState();
    this.submissionProcessingService.endProcessingState();
  }

  testShowInfo() {
    console.log('testShowInfo');
    this.submissionProcessingService.displayInfo('Data is being encrypted');
  }
  testShowError() {
    console.log('testShowError');
    this.submissionProcessingService.displayError('longer error message for testing');
  }
  testShowSuccess() {
    console.log('testShowSuccess');
    this.submissionProcessingService.displaySuccess('displaySuccess');
  }
  testShowFailure() {
    console.log('testShowSuccess');
    this.submissionProcessingService.displayFailure('The score for your data submission was below the acceptable limit. No rewards were awarded.');
  }
}
