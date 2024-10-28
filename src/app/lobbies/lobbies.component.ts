import {Component, OnInit, ViewChild} from '@angular/core';
import {BehaviorSubject, combineLatest, Observable, of, Subject, Subscription, take, takeUntil} from 'rxjs';
import {LobbyService} from '../services/lobby.service';
import {AuthService} from '../services/auth.service';
import {Lobby} from '../models/lobby.model';
import {IonModal} from "@ionic/angular";
import {map, switchMap} from "rxjs/operators";
import {Router} from "@angular/router";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {User} from "../models/user.model";


@Component({
  selector: 'app-lobbies',
  templateUrl: './lobbies.component.html',
  styleUrls: ['./lobbies.component.scss']
})
export class LobbiesComponent implements OnInit {
  @ViewChild('createLobbyModal') modal: IonModal;
  @ViewChild('tagModal') tagModal: IonModal;
  lobbies: Observable<Lobby[]>;
  userId: string = "1123";
  games$: Observable<any[]>;
  selectedGame: any = "rps";
  lobbyName: string;
  maxRounds: number;
  searchTerm: string = '';
  hasLobby: boolean = false;
  joinedlobby: any;
  currentuser: User;
  userslobby: Lobby;

  private userLobbySubscription: Subscription;
  private getuserSub: Subscription;

  constructor(
    private lobbyService: LobbyService,
    private authService: AuthService,
    private router: Router,
  ) {
  }


  openTagModal() {
    this.tagModal.present();
  }

  dismissTagModal() {
    this.tagModal.dismiss();
  }

  ngOnInit(): void {
    this.getuserSub = this.authService.getUserData().pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentuser = user;
        this.userId = user.uid;
        this.joinedlobby = user.inLobby;
        if(this.joinedlobby === "" || this.joinedlobby === null){
          this.joinedlobby = null;
        }
        this.userLobbySubscription = this.lobbyService.getUserLobby(this.currentuser.uid).subscribe(userLobby => {
          this.userslobby = userLobby;
          if (userLobby) {
            this.hasLobby = userLobby.status !== 'ended';
          } else {
            this.hasLobby = false;
          }
        });
        this.filterLobbies(this.userId);
      }
    });
    this.games$ = this.lobbyService.getGames();
  }

  ngOnDestroy(): void {
    if (this.userLobbySubscription) {
      this.userLobbySubscription.unsubscribe();
    }

    if (this.getuserSub) {
      this.getuserSub.unsubscribe();
    }
  }

  async filterLobbies(userId) {
    this.lobbies = this.lobbyService.getLobbies(userId).pipe(
      map(lobbies => lobbies.filter(lobby => this.applyFilters(lobby)))
    );
  }

  applyFilters(lobby: Lobby): boolean {
    if (this.searchTerm) {
      const terms = this.searchTerm.split(':');
      if (terms.length === 2) {
        const [key, value] = terms.map(t => t.trim().toLowerCase());
        return lobby[key]?.toLowerCase().includes(value);
      }
    }
    return true;
  }


  async toggleCreateLobby() {
    await this.modal.present();
  }

  createLobby() {
    if (this.currentuser) {
      const newLobby: Omit<Lobby, 'id'> = {
        name: this.lobbyName,
        owner: this.currentuser.username,
        ownerId: this.currentuser.uid,
        players: [this.currentuser.uid],
        status: "setup",
        maxRounds: this.maxRounds,
        gameType: this.selectedGame,
        minPlayers: 2,
        maxPlayers: 8,
        hasBots: false,
        otherSettings: this.selectedGame.otherSettings || {},
        spectators: [],
        currentRound: 0,
      };

      this.lobbyService.createLobby(newLobby, this.userId).then(docRef => {
        console.log('Lobby created with ID:', docRef.id);
      });
    }
    this.modal.dismiss();
  }

  isOwner(lobby: Lobby): boolean {
    return lobby.ownerId === this.userId;
  }

  isUserInLobby(lobby: Lobby): boolean {
    return lobby.players.includes(this.userId);
  }
  isUserSpectatingLobby(lobby: Lobby): boolean {
    return lobby.spectators.includes(this.userId);
  }


  getLobbyBackgroundColor(lobby: Lobby): string {
    if (this.isOwner(lobby)) {
      return 'lightblue';
    } else if (lobby.status === 'started') {
      return 'lightgray';
    }  else if (lobby.status === 'private') {
      return 'red';
    } else {
      return 'green';
    }
  }

  startGame(lobbyId: string) {
    let players;
    if (this.userslobby) {
      if (this.userslobby && this.userslobby.players) {
        players = this.userslobby.players;
        console.log('Játékosok:', players);
        if (players.length < this.userslobby.minPlayers) {
          console.log('Nincs elég játékos a játék indításához. Minimum 2 játékos szükséges.');
          return;
        }
        if (players.length > this.userslobby.maxPlayers) {
          console.log('Túl sok játékos van a váróban ahhoz hogy elinduljon a játék.');
          return;
        }
        this.userslobby.status = "started";

        this.lobbyService.startGame(lobbyId, players).then(() => {
          this.initiateCountdown(lobbyId);
        });
      }
    }
  }

  initiateCountdown(lobbyId: string) {
    let countdown = 3;
    const interval = setInterval(() => {
      if (countdown > 0) {
        this.showCountdownMessage(`A játék hamarosan kezdődik... ${countdown}`);
        countdown--;
      } else {
        clearInterval(interval);
        this.redirectToGameScreen(lobbyId);
      }
    }, 1000);
  }

  showCountdownMessage(message: string) {
    const countdownElement = document.createElement('div');
    countdownElement.innerText = message;
    countdownElement.style.position = 'fixed';
    countdownElement.style.top = '50%';
    countdownElement.style.left = '50%';
    countdownElement.style.transform = 'translate(-50%, -50%)';
    countdownElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    countdownElement.style.color = 'white';
    countdownElement.style.padding = '20px';
    countdownElement.style.zIndex = '1000';
    countdownElement.style.borderRadius = '10px';
    countdownElement.style.fontSize = '24px';
    document.body.appendChild(countdownElement);

    setTimeout(() => {
      document.body.removeChild(countdownElement);
    }, 3000); // Az üzenet 3 másodperc után eltűnik
  }

  redirectToGameScreen(lobbyId: string) {
    this.router.navigate(['/game/'+ lobbyId ]);
  }

  destroyLobby(lobbyId: string) {
    this.joinedlobby = null;
    this.lobbyService.destroyLobby(lobbyId).then(() => {
      console.log('Lobby destroyed');
    });
  }

  addBot(lobbyId: string) {
    console.log('Később valósítjuk meg.');
    // this.lobbyService.addBot(lobbyId).then(() => {
    //   console.log('Bot added to lobby');
    // });
  }

  kickUser(lobbyId: string) {
    console.log('Később valósítjuk meg.');
  }

  joinLobby(lobbyId: string) {
    this.joinedlobby = lobbyId;
    this.lobbyService.joinLobby(lobbyId, this.userId).then(() => {
      console.log('Joined lobby');
    });
  }

  joinAsSpectator(lobbyId: string) {
    this.joinedlobby = lobbyId;
    this.lobbyService.addSpectator(lobbyId, this.userId).then(() => {
      console.log('Joined as spectator');
    });
  }

  leaveAsSpectator(lobbyId: string) {
    this.joinedlobby = null;
    this.lobbyService.removeSpectator(lobbyId, this.userId).then(() => {
      console.log('stopped spectating');
    });
  }

  leaveLobby(lobbyId: string) {
    this.joinedlobby = null;
    this.lobbyService.leaveLobby(lobbyId, this.userId).then(() => {
      console.log('Left lobby');
    });
  }

  jumptogame(lobbyId: string) {
    console.log(['/game/'+ lobbyId ])
    this.router.navigate(['/game/'+ lobbyId ]);
  }
}
