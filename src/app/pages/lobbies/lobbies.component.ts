import {AfterViewInit, Component, OnChanges, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {catchError, Observable, of, Subscription, take} from 'rxjs';
import {LobbyService} from '../../shared/services/lobby.service';
import {AuthService} from '../../shared/services/auth.service';
import {Lobby} from '../../shared/models/lobby.model';
import {IonModal} from "@ionic/angular";
import {map} from "rxjs/operators";
import {Router} from "@angular/router";
import {User} from "../../shared/models/user.model";
import {CreateLobbyModalComponent} from "./create-lobby-modal/create-lobby-modal.component";
import {SubscriptionTrackerService} from "../../shared/services/subscriptionTracker.service";
import {Game} from "../../shared/models/game.model";


@Component({
  selector: 'app-lobbies',
  templateUrl: './lobbies.component.html',
  styleUrls: ['./lobbies.component.scss'],
})
export class LobbiesComponent implements OnInit, OnDestroy {
  private CATEGORY = "lobbies"
  @ViewChild(CreateLobbyModalComponent) createLobbyModal!: CreateLobbyModalComponent;
  @ViewChild('tagModal') tagModal: IonModal;
  lobbies: Observable<Lobby[]>;
  userId: string = "1123";
  games$: Promise<Game[]>;
  searchTerm: string = '';
  hasLobby: boolean = false;
  joinedLobby: any;
  currentUser: User;
  usersLobby: Lobby;
  minPlayers: number = 0;
  maxPlayers: number = 0;
  createModal: boolean = false;
  listLive: boolean = true;


  constructor(
    private lobbyService: LobbyService,
    private authService: AuthService,
    private router: Router,
    private tracker: SubscriptionTrackerService,
  ) {
  }

  ngOnInit() {
    this.searchTerm = window.location.pathname.split('/lobbies/')[1] || '';
    let authSub = this.authService.getUserData().pipe(
      map(user => {
        // console.log('Beérkező felhasználói adat:', user);
        return user || null;
      }),
      catchError(error => {
        console.error("Hiba történt az adatok lekérése során:", error);
        return of(null);
      })
    ).subscribe(user => {
      this.currentUser = user;
      this.userId = user?.id || "nincs";
      this.joinedLobby = user?.inLobby || null;

      if (this.joinedLobby === "" || this.joinedLobby === null) {
        this.joinedLobby = null;
      }

      if (user) {
        this.filterLobbies(this.userId, this.listLive);
      }
    });
    this.tracker.add(this.CATEGORY, "getUserDataSub", authSub);
    this.games$ = this.lobbyService.getGames();
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  async filterLobbies(userId:string, live: boolean) {
    this.lobbies = this.lobbyService.getLobbies(userId, live).pipe(
      map(({userLobby, otherLobbies}) => {
        this.usersLobby = userLobby;

        this.hasLobby = this.usersLobby != null &&
          this.usersLobby.status !== "ended" &&
          this.currentUser.inLobby !== '';

        const allLobbies = userLobby ? [userLobby, ...otherLobbies] : otherLobbies;
        return allLobbies.filter(lobby => this.applyFilters(lobby, userId));
      })
    );
  }

  applyFilters(lobby: Lobby, userId: string): boolean {
    if (this.searchTerm) {
      const terms = this.searchTerm.split(':');
      if (terms.length === 2) {
        const [key, value] = terms.map(t => t.trim().toLowerCase());
        return lobby[key]?.toLowerCase().includes(value);
      }
    }

    if (lobby.players.indexOf(userId) > -1) {
      return true;
    }

    if (lobby.spectators.indexOf(userId) > -1) {
      return true;
    }

    let searched = !lobby.private;

    if (!searched && this.searchTerm != '' && this.searchTerm != null && this.searchTerm === lobby.id) {
      searched = true;
    }

    return searched;
  }

  async toggleCreateLobby() {
    this.createModal = true;
    await this.createLobbyModal.modal.present();
  }

  handleModalClose() {
    this.createModal = false;
  }

  changeFilteredLobbyStatus() {
    this.listLive = !this.listLive;
    if (this.currentUser) {
      this.filterLobbies(this.userId, this.listLive);
    }
  }
}
