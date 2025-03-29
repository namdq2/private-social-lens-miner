import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { MinerMainComponent } from './components/miner-main/miner-main.component';
import { MinerAppContainerComponent } from './components/miner-app-container/miner-app-container.component';
import { StakingRewardsInfoComponent } from './components/staking-rewards-info/staking-rewards-info.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'app',
    component: MinerAppContainerComponent,
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
