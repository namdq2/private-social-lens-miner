export interface IAppConfigItem {
  dFusion: IDFusion;
  telegram: ITelegram;
  pinata: IPinata;
  vana: IVana;
  cloudFlare: ICloudFlare;
  gelato: IGelato;
  reownAppkit: IReownAppkit;
}

export interface IDFusion {
  validatorBackendUrl: string;
}

export interface ITelegram {
  apiId: number;
  apiHash: string;
  botToken: string;
  botId: number;
  botUsername: string;
}

export interface IPinata {
  apiKey: string;
  jwt: string;
  gatewayDomain: string;
  fileBaseUrl: string;
}

export interface IVana {
  dlpSmartContractAddress: string;
  dataRegistrySmartContractAddress: string;
  teePoolSmartContractAddress: string;
  tokenSmartContractAddress: string;
  tokenSymbolSmartContractAddress: string;
  tokenDecimalsSmartContractAddress: string;
  dlpPublicKey: string;
  stakingSmartContractAddress: string;
  vanaScanUrl: string;
  rpcUrl: string;
}

export interface ICloudFlare {
  siteKey: string;
}

export interface IGelato {
  apiKey: string;
}

export interface IReownAppkit {
  projectId: string;
}
