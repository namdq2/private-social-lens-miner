import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, share } from 'rxjs';
import { IAppConfigItem, IDFusion, IGelato, IPinata, IRelayApi, IReownAppkit, ITelegram, IVana } from '../models/app-config';

@Injectable({
  providedIn: 'root',
})
export class AppConfigService {
  private readonly httpClient: HttpClient = inject(HttpClient);

  public dFusion: IDFusion | null = null;
  public telegram: ITelegram | null = null;
  public pinata: IPinata | null = null;
  public vana: IVana | null = null;
  // public cloudFlare: ICloudFlare | null = null;
  public gelato: IGelato | null = null;
  public reownAppkit: IReownAppkit | null = null;
  public relayApi: IRelayApi | null = null;

  constructor() {}

  async setupAppWithConfigItem(appConfigItem: IAppConfigItem) {
    this.validateConfigItem(appConfigItem);

    this.dFusion = appConfigItem.dFusion;
    this.telegram = appConfigItem.telegram;
    this.pinata = appConfigItem.pinata;
    this.vana = appConfigItem.vana;
    // this.cloudFlare = appConfigItem.cloudFlare;
    this.gelato = appConfigItem.gelato;
    this.reownAppkit = appConfigItem.reownAppkit;
    this.relayApi = appConfigItem.relayApi;
  }

  private validateConfigItem(appConfigItem: IAppConfigItem) {
    if (!appConfigItem.dFusion) {
      throw new Error('dFusion configuration is missing.');
    }
    if (!appConfigItem.telegram) {
        throw new Error('Telegram configuration is missing.');
    }
    if (!appConfigItem.pinata) {
        throw new Error('Pinata configuration is missing.');
    }
    if (!appConfigItem.vana) {
        throw new Error('Vana configuration is missing.');
    }
    // if (!appConfigItem.cloudFlare) {
    //     throw new Error('CloudFlare configuration is missing.');
    // }
    if (!appConfigItem.gelato) {
        throw new Error('Gelato configuration is missing.');
    }
    if (!appConfigItem.reownAppkit) {
        throw new Error('ReownAppkit configuration is missing.');
    }
    if (!appConfigItem.relayApi) {
        throw new Error('RelayApi configuration is missing.');
    }
  }

  public load(aConfigPath: string): Promise<any> {
    return this.httpClient
      .get(aConfigPath)
      .pipe(
        map(async (response) => {
          const vAppConfigItem: IAppConfigItem = response as IAppConfigItem;
          await this.setupAppWithConfigItem(vAppConfigItem);
        }),
      )
      .pipe(share())
      .toPromise();
  }
}
