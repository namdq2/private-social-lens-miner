import { inject, Injectable, signal } from '@angular/core';
import { BrowserProvider, ethers } from 'ethers';
import { AppConfigService } from './app-config.service';

// import DLPTokenABI from '../assets/contracts/DLPTokenImplementation.json';
import DataLiquidityPoolABI from '../assets/contracts/DataLiquidityPoolLightImplementation.json';
import DataRegistryImplementationABI from '../assets/contracts/DataRegistryImplementation.json';
import StakingABI from '../assets/contracts/StakingImplemenation.json';
import TeePoolImplementationABI from '../assets/contracts/TeePoolImplementation.json';
import TokenABI from '../assets/contracts/TokenImplementation.json';

@Injectable({
  providedIn: 'root',
})
export class Web3WalletService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);

  public get rpcUrl() {
    return this.appConfigService.vana?.rpcUrl;
  }

  public get vanaScanUrl() {
    return this.appConfigService.vana?.vanaScanUrl;
  }

  public get dlpTokenAddress() {
    return this.appConfigService.vana?.tokenSmartContractAddress;
  }

  public get dlpTokenVanaScanUrl(): string {
    return `${this.vanaScanUrl}/address/${this.dlpTokenAddress}`;
  }

  public dlpTokenSymbol = signal<string>('$VFSN');
  public dlpTokenAmount = signal<number | bigint | string | null>(null);
  public vanaTokenAmount = signal<number | bigint | string | null>(null);

  // private walletPrivateKey = '';
  // public wallet = new ethers.Wallet(this.walletPrivateKey);
  public rpcProvider: ethers.JsonRpcProvider = new ethers.JsonRpcProvider(this.rpcUrl);
  // public signer = this.wallet.connect(this.rpcProvider);

  public walletAddress = signal<string>('');
  public encryptionKey = signal<string>('');

  public dlpContract = new ethers.Contract(this.appConfigService.vana!.dlpSmartContractAddress, DataLiquidityPoolABI.abi, this.rpcProvider);

  public dataRegistryContract = new ethers.Contract(
    this.appConfigService.vana!.dataRegistrySmartContractAddress,
    DataRegistryImplementationABI.abi,
    this.rpcProvider,
  );

  public teePoolContract = new ethers.Contract(this.appConfigService.vana!.teePoolSmartContractAddress, TeePoolImplementationABI.abi, this.rpcProvider);

  public tokenContract = new ethers.Contract(this.appConfigService.vana!.tokenSmartContractAddress, TokenABI.abi, this.rpcProvider);

  public stakingContract = new ethers.Contract(this.appConfigService.vana!.stakingSmartContractAddress, StakingABI.abi, this.rpcProvider);

  constructor() { }

  // public async signMessage(): Promise<string> {
  //   try {
  //     this.encryptionSeed.set(`dFusion Private Social Lens miner encryption key. Session: ${crypto.randomUUID()}`);
  //     const signature = await this.wallet.signMessage(this.encryptionSeed());
  //     console.log('signature', signature);
  //     return signature;
  //   } catch (error: any) {
  //     if (error instanceof Error) {
  //       throw new Error(`Message signing failed: ${error.message}`);
  //     }
  //     throw new Error('An unknown error occurred while signing the message.');
  //   }
  // }

  public async calculateBalance() {
    try {
      if (this.walletAddress()) {
        // console.log('Wallet Address:', this.walletAddress);
        // const decimals = BigInt(18); // await dlpTokenContract.decimals();
        // console.log('decimals', decimals);
        const balanceOf = await this.tokenContract['balanceOf'](this.walletAddress());
        const formattedTokenBalance = ethers.formatUnits(balanceOf, 18);
        // console.log('balanceOf', balanceOf);
        // console.log('formattedTokenBalance', formattedTokenBalance);
        this.dlpTokenAmount.set(Number(formattedTokenBalance).toFixed(5));

        const vanaBalance = await this.rpcProvider.getBalance(this.walletAddress());
        // console.log('vanaBalance', vanaBalance);
        const formattedVanaBalance = ethers.formatUnits(vanaBalance, 18);
        // console.log('formattedVanaBalance', formattedVanaBalance);
        this.vanaTokenAmount.set(Number(formattedVanaBalance).toFixed(5));
      } else {
        console.error('Wallet not connected');
      }
    } catch (error) {
      console.error('Failed to initialize balance:', error);
    }
  }

}
