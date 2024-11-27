import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from './services/auth.service';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {NgIf} from "@angular/common";
import {SubscriptionTrackerService} from "./services/subscriptionTracker.service";
import {User} from "./models/user.model";
import {Game} from "./models/game.model";
import {Lobby} from "./models/lobby.model";
import {LobbyService} from "./services/lobby.service";
import {delay, Observable} from "rxjs";
import {tap} from "rxjs/operators";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
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
              ) {}

  ngOnDestroy(): void {
    this.tracker.unsubscribeAll()
  }

  ngOnInit() {
    const userSubscription = this.authService.getUserObservable().pipe(
      // Use a more comprehensive state tracking
      tap(user => {
        console.log('User observable emitted:', user);
      }),
      // Delay slightly to ensure Firebase has time to resolve
      delay(0)
    ).subscribe(user => {
      // Explicitly handle different states
      if (user === null) {
        // This could mean either not logged in or still loading
        this.isLoggedIn = false;
        this.user = null;
      } else {
        this.isLoggedIn = true;
        this.user = user;
      }

      console.log('Final user state:', {
        isLoggedIn: this.isLoggedIn,
        user: this.user
      });
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
