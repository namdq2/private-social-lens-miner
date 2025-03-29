// import { inject, Injectable } from '@angular/core';
// import { AppConfigService } from './app-config.service';
// import { TelegramApiService } from './telegram-api.service';
// import { SubmissionProcessingService } from './submission-processing.service';

// @Injectable({
//   providedIn: 'root',
// })
// export class CloudFlareService {
//   private readonly appConfigService: AppConfigService = inject(AppConfigService);
//   private readonly telegramApiService: TelegramApiService = inject(TelegramApiService);
//   private readonly submissionProcessingService: SubmissionProcessingService = inject(SubmissionProcessingService);

//   private cloudFlareWidgetId: string = '';

//   public renderTurnstile() {
//     // widget already open
//     if (this.cloudFlareWidgetId) {
//       console.error('cloudFlareWidgetId exists');
//       return;
//     }

//     // @ts-ignore
//     const id = window.turnstile.render('#turnstile-container', {
//       sitekey: this.appConfigService.cloudFlare?.siteKey,
//       callback: (token: string) => {
//         console.debug(`Challenge Success: ${token}`);

//         this.telegramApiService.sendBotMessage(`/social_truth_verify|${token}|TelegramMiner`).then(
//           (sendBotMsgRes) => {
//             console.log('sendBotMsgRes', sendBotMsgRes);

//             this.removeTurnstile();
//             this.closeCloudFlareDialog();
//           }
//         ).catch((error) => {
//           console.error('Error sending message to telegram bot:', error);
//           this.handleErrorsDuringTurnstile(`We were unable to verify your request. Please try again.`);
//         });

//       },
//       'error-callback': () => {
//         console.error('Challenge failed.');
//         this.submissionProcessingService.displayError('Human verification failed');

//         setTimeout(() => {
//           this.closeCloudFlareDialog();
//           this.removeTurnstile();
//         }, 1500);
//       },
//     });

//     this.cloudFlareWidgetId = id;
//   }

//   private handleErrorsDuringTurnstile(error: string) {
//     console.error('turnstile error', error);
//     this.submissionProcessingService.displayError(error);
//     this.removeTurnstile();
//     this.closeCloudFlareDialog();
//   };

//   private removeTurnstile() {
//     if (this.cloudFlareWidgetId) {
//       // @ts-ignore
//       window.turnstile.remove(this.cloudFlareWidgetId);
//       this.cloudFlareWidgetId = '';
//     }
//   };

//   private closeCloudFlareDialog() {
//     this.submissionProcessingService.showCloudFlare.set(false);
//   };

//   public openCloudFlareDialog() {
//     this.submissionProcessingService.showCloudFlare.set(true);
//   };
// }
