export interface IStake {
  amount: number;
  startTime: number;
  duration: number;
  hasWithdrawn: boolean;
  withdrawalTime: number;
}