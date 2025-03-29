import { Component } from '@angular/core';

@Component({
  selector: 'app-staking-rewards-info',
  standalone: false,
  templateUrl: './staking-rewards-info.component.html',
  styleUrl: './staking-rewards-info.component.scss',
})
export class StakingRewardsInfoComponent {
  public stakeVana() {
    window.open('https://datahub.vana.com/', '_blank');
  }

  public stakeVFSN() {
    window.open('https://vana.genesis.dfusion.ai/', '_blank');
  }

}
