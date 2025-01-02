import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from './shared/services/auth.service';
import {Router} from '@angular/router';
import {SubscriptionTrackerService} from "./shared/services/subscriptionTracker.service";
import {User} from "./shared/models/user.model";
import {Lobby} from "./shared/models/lobby.model";
import {LobbyService} from "./shared/services/lobby.service";
import {Observable} from "rxjs";
import {LanguageService} from "./shared/services/language.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private CATEGORY = "app"
  isLoggedIn: boolean = false;
  user: User = null;
  lobbyId: string;
  lobby: Observable<Lobby>;


  constructor(private authService: AuthService,
              private router: Router,
              private lobbyService: LobbyService,
              private tracker: SubscriptionTrackerService,
              private languageService: LanguageService,
              ) {}

  ngOnDestroy(): void {
    this.tracker.unsubscribeAll()
  }

  ngOnInit() {
   const userSubscription = this.authService.getUserObservable().subscribe(user => {
      this.isLoggedIn = !!user;
      this.user = user;
    });
    this.tracker.add(this.CATEGORY, "getAuthState", userSubscription);
  }

  logout() {
    this.authService.logout().then(() => {
      this.isLoggedIn = false;
      this.user = null;
      this.router.navigate(['/login']);
    });
  }
}
