import { inject, Injectable, signal } from "@angular/core";
import { ReferralApiService } from "./referral-api.service";

@Injectable({
  providedIn: 'root',
})
export class ReferralService {
  private readonly referralApiService: ReferralApiService = inject(ReferralApiService);

  public userReferralCode = signal<string>('');
  public referralRewardCode = signal<string>(''); // user uses someone else's referral code

  public async getTopNReferrals() {
      const referralLeaderboardList = await this.referralApiService.getTopNReferrals();
      console.log('referralLeaderboardList', referralLeaderboardList);
      return
    }
}