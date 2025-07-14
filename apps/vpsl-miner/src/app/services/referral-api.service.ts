import { inject, Injectable } from "@angular/core";
import { ElectronIpcService } from "./electron-ipc.service";

@Injectable({
  providedIn: 'root',
})
export class ReferralApiService {
  // private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);

    // private get apiUrl() {
    //   return this.appConfigService.dFusion?.validatorBackendUrl;
    // }

    // constructor(private http: HttpClient) {}

    // public getTopNReferrals(): Observable<IReferralLeaderboardDto> {
    //   const url = this.apiUrl as string;
    //   const params = new HttpParams().set('topNRecords', 10);

    //   return this.http.get<IReferralLeaderboardDto>(`${url}/api/submission-referrals/leaderboard`, { params });
    // }

    public async getTopNReferrals() {
      return await this.electronIpcService.getTopNReferrals();
    }
}