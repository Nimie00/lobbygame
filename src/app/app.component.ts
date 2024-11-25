import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from './services/auth.service';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {NgIf} from "@angular/common";
import {SubscriptionTrackerService} from "./services/subscriptionTracker.service";
import {User} from "./models/user.model";
import {Game} from "./models/game.model";
import {Lobby} from "./models/lobby.model";
import {LobbyService} from "./services/lobby.service";
import {Observable} from "rxjs";

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
