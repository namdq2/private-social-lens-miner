import { inject, signal, Injectable } from '@angular/core';
import { ethers } from 'ethers';

import { IStake } from '../models/staking';
import { Web3WalletService } from './web3-wallet.service';

@Injectable({ providedIn: 'root' })
export class StakingApiService {
  private readonly web3WalletService: Web3WalletService = inject(Web3WalletService);
  // public get signer() {
  //   return this.web3WalletService.signer;
  // }

  public async getActiveStakes() {
    const blockchainStakes = await this.web3WalletService.stakingContract['getActiveStakes'](this.web3WalletService.walletAddress());
    // console.log('blockchainStakes', blockchainStakes);
    const vfsnStakes: Array<IStake> = [];

    blockchainStakes.forEach((stake: any, index: any) => {
      const vfsnStake: IStake = {
        amount: Number(ethers.formatUnits(stake.amount, 18)),
        startTime: Number(ethers.formatUnits(stake.startTime, 0)),
        duration: Number(ethers.formatUnits(stake.duration, 0)),
        hasWithdrawn: stake.hasWithdrawn,
        withdrawalTime: Number(ethers.formatUnits(stake.withdrawalTime, 0)),
      };

      vfsnStakes.push(vfsnStake);
    });

    return vfsnStakes;
  }

  public getTotalVFSNStaked(vfsnStakes: Array<IStake>) {
    const totalStakeAmount = vfsnStakes.reduce((sum, stake) => sum + stake.amount, 0);
    return totalStakeAmount;
  }
}
