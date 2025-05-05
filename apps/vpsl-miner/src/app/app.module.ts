import { ConfirmWalletDialogComponent } from './components/confirm-wallet-dialog/confirm-wallet-dialog.component';
import { NgOptimizedImage } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { HotWalletComponent } from './components/hot-wallet/hot-wallet.component';
import { MinerAppContainerComponent } from './components/miner-app-container/miner-app-container.component';
import { MinerMainComponent } from './components/miner-main/miner-main.component';
import { StakingRewardsInfoComponent } from './components/staking-rewards-info/staking-rewards-info.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
// import { MatStepperModule } from '@angular/material/stepper';
import { MinerSettingsComponent } from './components/miner-settings/miner-settings.component';
import { SubmissionProcessingComponent } from './components/submission-processing/submission-processing.component';
import { TelegramDialogComponent } from './components/telegram-dialog/telegram-dialog.component';
import { TelegramMainComponent } from './components/telegram-main/telegram-main.component';
import { TelegramMessageComponent } from './components/telegram-message/telegram-message.component';
import { TelegramSigninComponent } from './components/telegram-signin/telegram-signin.component';
import { TelegramComponent } from './components/telegram/telegram.component';
import { WalletComponent } from './components/wallet/wallet.component';
import { PhoneInputDirective } from './directives/phone-input.directive';
import { AppConfigService } from './services/app-config.service';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { SignMessageWalletComponent } from './components/sign-message-wallet/sign-message-wallet.component';
import { StakePlaceComponent } from './components/stake-place/stake-place.component';
import { MatInputModule } from '@angular/material/input';
import { StakeRecordsComponent } from './components/stake-records/stake-records.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { StakeResultModalComponent } from './components/stake-result-modal/stake-result-modal.component';
import { ReconnectInstructionDialogComponent } from './components/reconnect-instruction-dialog/reconnect-instruction-dialog.component';
import { ResignMessageComponent } from './components/resign-message/resign-message.component';
import { WalletButtonComponent } from './components/wallet-button/wallet-button.component';
@NgModule({
  schemas: [
    // CUSTOM_ELEMENTS_SCHEMA,
  ],
  declarations: [
    AppComponent,
    HeaderComponent,
    HotWalletComponent,
    StakingRewardsInfoComponent,
    MinerMainComponent,
    WalletComponent,
    TelegramComponent,
    MinerAppContainerComponent,
    TelegramMainComponent,
    TelegramDialogComponent,
    TelegramSigninComponent,
    TelegramMessageComponent,
    PhoneInputDirective,
    // StakingComponent,
    SubmissionProcessingComponent,
    MinerSettingsComponent,
    ConfirmDialogComponent,
    ConfirmWalletDialogComponent,
    SignMessageWalletComponent,
    StakePlaceComponent,
    StakeRecordsComponent,
    StakeResultModalComponent,
    ReconnectInstructionDialogComponent,
    ResignMessageComponent,
    WalletButtonComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    NgOptimizedImage,
    HttpClientModule,

    MatDialogModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatSnackBarModule,
    MatSidenavModule,
    ClipboardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    ReactiveFormsModule,
    // MatStepperModule
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initialiseConfig,
      deps: [AppConfigService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

export function initialiseConfig(appConfigService: AppConfigService) {
  return () => {
    return appConfigService.load('config.json').catch((error) => {
      console.error('Failed to load app configuration:', error);
      throw error;
    });
  };
}
