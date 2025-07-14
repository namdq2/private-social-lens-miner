import { inject, Injectable } from '@angular/core';
import { ElectronIpcService } from './electron-ipc.service';

@Injectable({
  providedIn: 'root',
})
export class SubmissionUserApiService {
  // private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);

  // private get apiUrl() {
  //   return this.appConfigService.dFusion?.validatorBackendUrl;
  // }

  // constructor(private http: HttpClient) {}

  // public getSubmissionUserById(sourceId: string): Observable<ISubmissionUserDto> {
  //   const url = this.apiUrl as string;
  //   const params = new HttpParams().set('dataSource', DataSource.telegram).set('sourceId', sourceId);

  //   return this.http.get<ISubmissionUserDto>(`${url}/api/submission-users`, { params });
  // }

  public async getSubmissionUser(sourceId: string) {
    return await this.electronIpcService.getSubmissionUser(sourceId);
  }
}
