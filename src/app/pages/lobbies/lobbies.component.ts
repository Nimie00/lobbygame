import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {catchError, distinctUntilChanged, Observable, of, tap} from 'rxjs';
import {LobbyService} from '../../shared/services/lobby.service';
import {AuthService} from '../../shared/services/auth.service';
import {Lobby} from '../../shared/models/lobby.model';
import {map} from "rxjs/operators";
import {User} from "../../shared/models/user.model";
import {CreateLobbyModalComponent} from "./create-lobby-modal/create-lobby-modal.component";
import {SubscriptionTrackerService} from "../../shared/services/subscriptionTracker.service";
import {ModalService} from "../../shared/services/modal-services/modal.service";


@Component({
  selector: 'app-lobbies',
  templateUrl: './lobbies.component.html',
  styleUrls: ['./lobbies.component.scss'],
})
export class LobbiesComponent implements OnInit, OnDestroy {
  private CATEGORY = "lobbies"
  @ViewChild(CreateLobbyModalComponent) createLobbyModal!: CreateLobbyModalComponent;
  lobbiesObservables: Observable<Lobby[]>;
  lobbies: Lobby[];
  usersLobby: Lobby;
  currentUser: User;
  userId: string;
  joinedLobby: string;
  searchTerm: string = '';
  minPlayers: number = 0;
  maxPlayers: number = 0;
  hasLobby: boolean = false;
  createModal: boolean = false;
  listLive: boolean = true;

  constructor(
    private lobbyService: LobbyService,
    private authService: AuthService,
    private tracker: SubscriptionTrackerService,
    private modalService: ModalService) {
  }

  ngOnInit() {
    this.searchTerm = window.location.pathname.split('/lobbies/')[1] || '';
    const authSub = this.authService.getUserObservable().pipe(
      distinctUntilChanged(),
      tap(user => {
        this.currentUser = user;
        this.userId = this.currentUser.id || null;
        this.joinedLobby = this.currentUser.inLobby || null;

        if (this.joinedLobby === "") {
          this.joinedLobby = null;
        }

        if (this.currentUser) {
          this.loadAndFilterLobbies()
        }
      }),
      catchError(error => {
        console.error("Hiba történt az adatok lekérése során:", error);
        return of(null);
      })
    ).subscribe();

    this.tracker.add(this.CATEGORY, "getUserDataSub", authSub);
  }

  async loadAndFilterLobbies(): Promise<void> {
    await this.checkInLiveLobby();
    await this.loadLobbies(this.userId, this.listLive);
  }

  async checkInLiveLobby() {
    if (this.joinedLobby) {
      let lobby = await this.lobbyService.getLobbySnapshot(this.joinedLobby)
      if(lobby.status){
        this.listLive = lobby.status!=="ended";
      }
    }
  }

  async loadLobbies(userId: string, live: boolean) {
    this.lobbiesObservables = this.lobbyService.getLobbies(userId, live).pipe(
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

  trackByLobbyId(index: number, lobby: any): string {
    return lobby.id;
  }

  async toggleCreateLobby() {
    this.createModal = true;
    this.modalService.openModal('createLobby', {
      currentUser: this.currentUser,
      lobby: null,
    });
  }

  changeFilteredLobbyStatus() {
    this.listLive = !this.listLive;
    if (this.currentUser) {
      this.loadLobbies(this.userId, this.listLive)
    }
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }
}
