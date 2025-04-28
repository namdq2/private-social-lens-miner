import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ethers } from 'ethers';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { Web3WalletService } from '../../services/web3-wallet.service';
import { ENCRYPTION_SEED } from '../../shared/constants';
import { MatDialog } from '@angular/material/dialog';
import { PasswordDialogueComponent } from '../password-dialog/password-dialogue.component';
import { CryptographyService } from '../../services/cryptography.service';


@Component({
  selector: 'app-hot-wallet',
  standalone: false,
  templateUrl: './hot-wallet.component.html',
  styleUrl: './hot-wallet.component.scss',
})
export class HotWalletComponent {

  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  private readonly router: Router = inject(Router);
  private readonly matDialog: MatDialog = inject(MatDialog);
  private password = '';


  public readonly validWalletAndEncryptionKey = effect(() => {
    const validWalletAddress = this.electronIpcService.walletAddress();
    const validEncryptionKey = this.electronIpcService.encryptionKey();
    const validPrivateKey = this.electronIpcService.privateKey();

    if (validWalletAddress && validEncryptionKey && validPrivateKey) {
      this.router.navigate(['app/miner']);
    }
  });

  public showWalletSetup = true;
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

  constructor(private cryptographyService: CryptographyService) { }

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
        this.wallet
          .signMessage(ENCRYPTION_SEED)
          .then(async (res: string) => {
            const { salt, encryptedKey: encryptionPrivateKey } = await this.cryptographyService.encryptPrivateKey(this.privateKey, this.password);
            this.electronIpcService.setSalt(salt);
            this.electronIpcService.setPrivateKey(encryptionPrivateKey);
            this.electronIpcService.setWalletAddress(this.wallet!.address);
            this.electronIpcService.setEncryptionKey(res);
          })
          .catch((err: any) => console.error('Failed to create encryption key', err));
      } else {
        console.error('Wallet not created');
      }
    }
  }

  public onOpenPasswordDialog () {
    const dialogRef = this.matDialog.open(PasswordDialogueComponent, {
      width: '500px',
      data: {
        isForCreate: true,
      },
    });

    dialogRef.afterClosed().subscribe((password: string) => {
      if (password) {
        this.password = password;
        this.onConfirmClick();
      }
    });
  }

  public async onDoneClick() {
    await this.web3WalletService.calculateBalance();
    this.router.navigate(['app/miner']);
  }

}
