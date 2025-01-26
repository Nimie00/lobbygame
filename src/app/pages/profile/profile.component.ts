import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '../../shared/services/auth.service';
import {SubscriptionTrackerService} from "../../shared/services/subscriptionTracker.service";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  private CATEGORY = "profile"
  currentUser: any;
  nextLevel: any;
  showStatistics: boolean = false;


  constructor(private authService: AuthService,
              private tracker: SubscriptionTrackerService,
  ) {
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  ngOnInit() {
    this.nextLevel = {xp:100};

    const authSub = this.authService.getUserData().subscribe(user => {
      if (user) {
        this.currentUser = user;
      } else {
        console.warn('No user data available.');
      }
      this.tracker.add(this.CATEGORY, "getUserDataSub", authSub);
    });
  }

  changeProfilePart(){
    this.showStatistics = !this.showStatistics;
  }
}
