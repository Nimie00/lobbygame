import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '../../../shared/services/auth.service';
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {User} from "../../../shared/models/user.model";

@Component({
  selector: 'app-profile-statistics',
  templateUrl: './profile-statistics.component.html',
  styleUrls: ['./profile-statistics.component.scss']
})
export class ProfileStatisticsComponent implements OnInit, OnDestroy {
  private CATEGORY = "profileStats"
  @Input() user: User;

  constructor(private afAuth: AngularFireAuth,
              private authService: AuthService,
              private tracker: SubscriptionTrackerService,
  ) {
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  ngOnInit() {
  }
}
