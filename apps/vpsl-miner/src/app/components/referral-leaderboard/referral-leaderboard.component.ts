import { Component, inject, OnInit, signal } from '@angular/core';
import { ReferralApiService } from '../../services/referral-api.service';
import { IReferralLeaderboardDto } from '../../models/referral';
import { ReferralService } from '../../services/referral.service';

@Component({
  selector: 'app-referral-leaderboard',
  standalone: false,
  templateUrl: './referral-leaderboard.component.html',
  styleUrl: './referral-leaderboard.component.scss',
})
export class ReferralLeaderboardComponent implements OnInit {
  private readonly referralApiService: ReferralApiService = inject(ReferralApiService);
  private readonly referralService: ReferralService = inject(ReferralService);

  public displayedColumns = ['rank', 'walletAddress', 'referralCount'];

  public referralLeaderboardList =  signal<Array<IReferralLeaderboardDto>>([]);

  async ngOnInit() {
    const vReferralLeaderboardList = await this.referralApiService.getTopNReferrals();
    if (this.referralLeaderboardList.length < 10) {
      while (vReferralLeaderboardList.length < 10) {
        vReferralLeaderboardList.push({
          walletAddress: '0x000...0000',
          referralCount: 0,
          referralAmount: 0,
        });
      }
    }

    this.referralLeaderboardList.set(vReferralLeaderboardList);
    console.log('this.referralLeaderboardList', this.referralLeaderboardList());
  }
}
