import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '../../shared/services/auth.service';
import {SubscriptionTrackerService} from "../../shared/services/subscriptionTracker.service";
import {LanguageService} from "../../shared/services/language.service";
import {AudioService} from "../../shared/services/audio.service";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  private CATEGORY = "profile"
  currentUser: any;
  nextLevel: number;
  showStatistics: boolean = false;


  constructor(private authService: AuthService,
              private tracker: SubscriptionTrackerService,
              private languageService: LanguageService,
              private audioService: AudioService,
  ) {
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
    this.audioService.stopAllSounds();
  }

  ngOnInit() {
    const authSub = this.authService.getUserData().subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.nextLevel = user.xpForNextLevel ?? 100;
      } else {
        console.warn('No user data available.');
      }
      this.tracker.add(this.CATEGORY, "getUserDataSub", authSub);
    });
  }

  changeProfilePart(showStats: boolean) {
    this.showStatistics = showStats;
  }
}
