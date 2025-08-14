import { inject, Injectable, signal } from "@angular/core";
import { ReferralService } from "./referral.service";
import { SubmissionUserApiService } from "./submission-user-api.service";
import { ISubmissionUserDto } from "../models/submission-user";

@Injectable({
  providedIn: 'root',
})
export class SubmissionUserService {
  private readonly submissionUserApiService: SubmissionUserApiService = inject(SubmissionUserApiService);
  private readonly referralService: ReferralService = inject(ReferralService);

  public submissionUser = signal<ISubmissionUserDto | null>(null);

  public async getSubmissionUser(sourceId: string) {
    const submissionUser = await this.submissionUserApiService.getSubmissionUser(sourceId);
    console.log('submissionUser', submissionUser);
    this.submissionUser.set(submissionUser);
    this.referralService.userReferralCode.set(submissionUser.referralCode);
  }
}