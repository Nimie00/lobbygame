import {Component, OnInit, ViewChild} from '@angular/core';
import {catchError, Observable, of, Subscription} from 'rxjs';
import {LobbyService} from '../services/lobby.service';
import {AuthService} from '../services/auth.service';
import {Lobby} from '../models/lobby.model';
import {IonModal} from "@ionic/angular";
import {map} from "rxjs/operators";
import {Router} from "@angular/router";
import {User} from "../models/user.model";
import {Game} from "../models/game.model";


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
  selectedGame: Game;
  lobbyName: string;
  maxRounds: number = 1;
  searchTerm: string = '';
  hasLobby: boolean = false;
  joinedLobby: any;
  currentUser: User;
  usersLobby: Lobby;
  enablePassword: boolean = false;
  password: string = '';
  private: boolean = false;
  allowSpectators: boolean = true;
  enablePlayerNumbers: boolean = false;

  minPlayers: number = 0;
  maxPlayers: number = 0;

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
    // Beállítjuk a currentUser-t
    this.authService.getUserData().pipe(
      map(user => {
        console.log('Beérkező felhasználói adat:', user);
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

      // Ha van user, beállítjuk a lobby adatait
      if (user) {
        this.lobbyService.getUserLobby(user.id).subscribe(userLobby => {
          this.usersLobby = userLobby;
          console.log('User Lobby:', userLobby);
        });
      }
    });
    this.filterLobbies(this.userId);
    console.log(this.lobbies);
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
    if (this.currentUser) {
      if(this.maxRounds > 10){
        this.maxRounds = 10;
      }
      let minNumber = this.selectedGame.minPlayers;
      let maxNumber = this.selectedGame.maxPlayers;
      if(this.maxPlayers != 0){
        maxNumber = this.maxPlayers;
      }
      if(this.minPlayers != 0){
        minNumber = this.minPlayers;
      }
      const newLobby: Omit<Lobby, 'id'> = {
        name: this.lobbyName,
        ownerName: this.currentUser.username,
        ownerId: this.currentUser.id,
        players: [this.currentUser.id],
        status: "setup",
        maxRounds: this.maxRounds,
        gameType: this.selectedGame.name,
        minPlayers: minNumber,
        maxPlayers: maxNumber,
        hasBots: false,
        gameModifiers: this.selectedGame.gameModifiers || {},
        spectators: [],
        currentRound: 0,
        password: this.password,
        private: this.private,
        allowSpectators: this.allowSpectators,
        playerNames: [this.currentUser.username],
        spectatorNames: [],
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
    } else if (lobby.private) {
      return 'red';
    } else {
      return 'green';
    }
  }

  startGame(lobbyId: string) {
    let players;
    if (this.usersLobby) {
      if (this.usersLobby && this.usersLobby.players) {
        players = this.usersLobby.players;
        console.log('Játékosok:', players);
        if (players.length < this.usersLobby.minPlayers) {
          console.log('Nincs elég játékos a játék indításához. Minimum 2 játékos szükséges.');
          return;
        }
        if (players.length > this.usersLobby.maxPlayers) {
          console.log('Túl sok játékos van a váróban ahhoz hogy elinduljon a játék.');
          return;
        }
        this.usersLobby.status = "started";

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
    this.router.navigate(['/game/' + lobbyId]);
  }

  destroyLobby(lobbyId: string) {
    this.joinedLobby = null;
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
    this.joinedLobby = lobbyId;
    this.lobbyService.joinLobby(lobbyId, this.userId).then(() => {
      console.log('Joined lobby');
    });
  }

  joinAsSpectator(lobbyId: string) {
    this.joinedLobby = lobbyId;
    this.lobbyService.addSpectator(lobbyId, this.userId).then(() => {
      console.log('Joined as spectator');
    });
  }

  leaveAsSpectator(lobbyId: string) {
    this.joinedLobby = null;
    this.lobbyService.removeSpectator(lobbyId, this.userId).then(() => {
      console.log('stopped spectating');
    });
  }

  leaveLobby(lobbyId: string) {
    this.joinedLobby = null;
    this.lobbyService.leaveLobby(lobbyId, this.userId).then(() => {
      console.log('Left lobby');
    });
  }

  jumptogame(lobbyId: string) {
    console.log(['/game/' + lobbyId])
    this.router.navigate(['/game/' + lobbyId]);
  }
}
