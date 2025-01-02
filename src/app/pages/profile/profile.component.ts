import {Component, OnDestroy, OnInit} from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import {Subscription} from "rxjs";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {SubscriptionTrackerService} from "../../shared/services/subscriptionTracker.service";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  private CATEGORY = "profile"
  user: any;

  constructor(private afAuth: AngularFireAuth,
              private authService: AuthService,
              private tracker: SubscriptionTrackerService,
              ) {}

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  ngOnInit() {
   const dataSubscription = this.authService.getUserData().subscribe(data => {
      this.user = data;
    });
    this.tracker.add(this.CATEGORY, "getUserDataSub", dataSubscription);
  }
}
