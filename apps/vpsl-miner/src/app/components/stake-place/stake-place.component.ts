import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-stake-place',
  standalone: false,
  templateUrl: './stake-place.component.html',
  styleUrl: './stake-place.component.scss',
})

export class StakePlaceComponent {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  public isViewStakeRecords: boolean = false;

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.isViewStakeRecords = params['viewStakeRecords'] === 'true';
    });
  }
}

