// import { inject, Injectable, signal } from '@angular/core';
// import { ethers } from 'ethers';

// import { IStake } from '../models/staking';
// import { AppConfigService } from './app-config.service';
// import { Web3WalletService } from './web3-wallet.service';

// @Injectable(
//   // { providedIn: 'root'}
// )
// export class StakingApiService {
//   private readonly appConfigService: AppConfigService = inject(AppConfigService);
//   private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);

//   public get signer() {
//     return this.web3WalletService.signer;
//   }

//   public activeStakes = signal<Array<any>>([]);

//   public async getActiveStakes() {
//     const blockchainStakes = await this.web3WalletService.stakingContract['getActiveStakes'](
//       this.signer.address
//     );
//     // console.log('blockchainStakes', blockchainStakes);
//     const vfsnStakes: Array<IStake> = [];

//     blockchainStakes.forEach((stake: any, index: any) => {
//       const vfsnStake: IStake = {
//         amount: Number(ethers.formatUnits(stake.amount, 18)),
//         startTime: Number(ethers.formatUnits(stake.startTime, 0)),
//         duration: Number(ethers.formatUnits(stake.duration, 0)),
//         hasWithdrawn: stake.hasWithdrawn,
//         withdrawalTime: Number(ethers.formatUnits(stake.withdrawalTime, 0)),
//       };

//       vfsnStakes.push(vfsnStake);
//     });

//     this.activeStakes.set(vfsnStakes);
//     // console.log('activeStakes()', activeStakes());
//   }
// }
