import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HotWalletComponent } from './components/hot-wallet/hot-wallet.component';
import { MinerMainComponent } from './components/miner-main/miner-main.component';
import { MinerAppContainerComponent } from './components/miner-app-container/miner-app-container.component';
import { StakingRewardsInfoComponent } from './components/staking-rewards-info/staking-rewards-info.component';
import { WalletConnectionComponent } from './components/wallet-connection/wallet-connection.component';
import { authGuard } from './guards/auth.guard';
import { SignMessageWalletComponent } from './components/sign-message-wallet/sign-message-wallet.component';
import { StakePlaceComponent } from './components/stake-place/stake-place.component';
import { StakeRecordsComponent } from './components/stake-records/stake-records.component';
import { ResignMessageComponent } from './components/resign-message/resign-message.component';

const routes: Routes = [
  {
    path: '',
    component: WalletConnectionComponent,
  },
  {
    path: 'sign-message',
    component: SignMessageWalletComponent,
  },
  {
    path: 'hot-wallet',
    component: HotWalletComponent,
  },
  {
    path: 'resign-message',
    component: ResignMessageComponent,
  },
  {
    path: 'app',
    component: MinerAppContainerComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'miner',
        component: MinerMainComponent
      },
      {
        path: 'staking-rewards',
        component: StakingRewardsInfoComponent,
      },
      {
        path: 'stake-place',
        component: StakePlaceComponent,
      },
      {
        path: 'stake-records',
        component: StakeRecordsComponent,
      },
    ]
  },
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
