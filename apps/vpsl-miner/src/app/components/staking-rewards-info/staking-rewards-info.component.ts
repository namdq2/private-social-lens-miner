import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-staking-rewards-info',
  standalone: false,
  templateUrl: './staking-rewards-info.component.html',
  styleUrl: './staking-rewards-info.component.scss',
})
export class StakingRewardsInfoComponent {
  private readonly router: Router = inject(Router);

  public stakeVana() {
    window.open('https://datahub.vana.com/', '_blank');
  }

  public stakeVFSN() {
    this.router.navigate(['/app/stake-place']);
  }

}
