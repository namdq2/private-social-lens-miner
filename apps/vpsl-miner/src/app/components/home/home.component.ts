import { Component, effect, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ethers } from "ethers";
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { ENCRYPTION_SEED } from '../../shared/constants';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {

  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly router: Router = inject(Router);

  public requiresWalletSetup = true;
  public appVersion = '';

  public readonly validWalletAndEncryptionKey = effect(() => {
    const validWalletAddress = this.electronIpcService.walletAddress();
    const validEncryptionKey = this.electronIpcService.encryptionKey();

    this.requiresWalletSetup = !validWalletAddress || !validEncryptionKey;
    if (!this.requiresWalletSetup) {
      this.router.navigate(['app/miner']);
    }
    return !this.requiresWalletSetup;
  });

  public showWalletSetup = false;
  public showWalletGeneration = false;
  public showVerification = false;
  public showEncryptionKeyCreation = false;
  public recoveryConfirmed = false;
  public showInvalidRecovery = false;

  private wallet: ethers.HDNodeWallet | null = null;
  public walletAddress = '';
  public privateKey = '';
  public mnemonic = '';

  public recovery2nd = '';
  public recovery6th = '';
  public recovery9th = '';

  public hasUserAgreed = false;

  constructor() { }

  ngOnInit() {
    this.appVersion = this.electronIpcService.appVersion() || '';
  }

  public onNextClick() {
    if (this.requiresWalletSetup) {
      this.showWalletSetup = true;
    }
    else {
      this.router.navigate(['app/miner']);
    }
  }

  public onGenerateClick() {
    if (this.hasUserAgreed) {
      this.showWalletGeneration = true;
      this.showWalletSetup = false;

      this.wallet = ethers.Wallet.createRandom();

      this.walletAddress = this.wallet.address;
      this.privateKey = this.wallet.privateKey;
      this.mnemonic = this.wallet.mnemonic!.phrase;
    }
  }

  public onVerifyClick() {
    this.showVerification = true;
    this.showWalletSetup = false;
    this.showWalletGeneration = false;
  }

  public onBackToReviewWalletClick() {
    this.showVerification = false;
    this.showWalletSetup = false;
    this.showInvalidRecovery = false;
    this.showWalletGeneration = true;
  }

  public onConfirmClick() {
    const recoveryPhraseList = this.mnemonic.split(' ');
    const v2nd = recoveryPhraseList[1];
    const v6th = recoveryPhraseList[5];
    const v9th = recoveryPhraseList[8];

    this.recoveryConfirmed = (this.recovery2nd.trim() === v2nd && this.recovery6th.trim() === v6th && this.recovery9th.trim() === v9th);
    this.showInvalidRecovery = !this.recoveryConfirmed;

    if (this.recoveryConfirmed) {
      this.showWalletSetup = false;
      this.showWalletGeneration = false
      this.showVerification = false;

      if (this.wallet) {
        this.wallet.signMessage(ENCRYPTION_SEED).then(
          async (res: string) => {
            this.electronIpcService.setWalletAddress(this.wallet!.address);
            this.electronIpcService.setEncryptionKey(res);
          }
        ).catch((err: any) => console.error('Failed to create encryption key', err));
      }
      else {
        console.error('Wallet not created');
      }
    }
  }

  public async onDoneClick() {
    await this.web3WalletService.calculateBalance();
    this.router.navigate(['app/miner']);
  }

}
