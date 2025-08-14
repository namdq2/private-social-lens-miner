export interface ISubmissionUserDto {
  dataSource: DataSource;
  sourceId: string;
  walletAddress: string;
  referralCode: string;
}

export enum DataSource {
  telegram = 'telegram',
  telegramMiner = 'telegramMiner',
}
