import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HotWalletComponent } from './components/hot-wallet/hot-wallet.component';
import { MinerMainComponent } from './components/miner-main/miner-main.component';
import { MinerAppContainerComponent } from './components/miner-app-container/miner-app-container.component';
import { StakingRewardsInfoComponent } from './components/staking-rewards-info/staking-rewards-info.component';
import { WalletConnectionComponent } from './components/wallet-connection/wallet-connection.component';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: WalletConnectionComponent,
  },
  {
    path: 'hot-wallet',
    component: HotWalletComponent,
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
      }
    ]
  },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
