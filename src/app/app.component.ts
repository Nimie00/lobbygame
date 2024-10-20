import {Component, OnInit} from '@angular/core';
import {AuthService} from './services/auth.service';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {NgIf} from "@angular/common";
import {Observable, Subscription} from "rxjs";
import {LobbyService} from "./services/lobby.service";
import {Lobby} from "./models/lobby.model";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isLoggedIn: boolean = false;
  user: any;
  lobbyId: string;
  lobby: Observable<Lobby>;
  activeGame: boolean = null;
  lobbysub: Subscription;
  private userSubscription: Subscription;

  constructor(private authService: AuthService, private router: Router, private lobbyService: LobbyService) {}

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.lobbysub) {
      this.lobbysub.unsubscribe();
    }
  }

  ngOnInit() {
    this.userSubscription = this.authService.getAuthStateObservable().subscribe(user => {
      this.isLoggedIn = !!user;
      this.user = user;
      if (this.isLoggedIn) {
        this.checkActiveGame();
      }
    });
  }

  async checkActiveGame() {
    this.authService.getUserData().subscribe(user => {
      if (user.inLobby && user.inLobby !== "" && user.inLobby != null) {
        this.lobbyId = user.inLobby;
        this.lobby = this.lobbyService.getLobby(user.inLobby);
        if (this.activeGame == null) {
          this.lobbysub = this.lobby.subscribe(lobby =>
            this.activeGame = lobby.status === "started");
        }
      } else {
        this.lobbyId = null;
        this.activeGame = false;
      }
    });

    if (this.lobbysub) {
      this.lobbysub.unsubscribe();
    }
  }


  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
