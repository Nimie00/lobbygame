import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '../../shared/services/auth.service';
import {AngularFireAuth} from "@angular/fire/compat/auth";
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
  showStatistics: boolean = true;


  constructor(private afAuth: AngularFireAuth,
              private authService: AuthService,
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
        console.log('Current User:', this.currentUser);
      } else {
        console.warn('No user data available.');
      }

      console.log(Date.now())
      console.log(new Date(Date.now() -1000));
      console.log(new Date(Date.now()));
      this.tracker.add(this.CATEGORY, "getUserDataSub", authSub);
    });
  }

  changeProfilePart(){
    this.showStatistics = !this.showStatistics;
  }
}
