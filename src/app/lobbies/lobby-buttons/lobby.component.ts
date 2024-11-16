import {Component, Input, ViewChild} from '@angular/core';
import {Lobby} from "../../models/lobby.model";
import {User} from "../../models/user.model";
import {LobbyService} from "../../services/lobby.service";
import {Router} from "@angular/router";
import {IonModal} from "@ionic/angular";
import {CreateLobbyModalComponent} from "../create-lobby-modal/create-lobby-modal.component";
import {LobbyPlayersManagingComponent} from "../lobby-players-managing-modal/lobby-players-managing.component";

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent {
  @ViewChild('modal') passwrodModal: IonModal;

  @Input() lobby: any;
  @Input() hasLobby: boolean = false;
  @Input() joinedLobby: string = null;
  @Input() userId: string = null;
  @Input() currentUser: User = null;
  @Input() usersLobby!: Lobby;
  @ViewChild(CreateLobbyModalComponent) createLobbyModal: CreateLobbyModalComponent;
  @ViewChild(LobbyPlayersManagingComponent) lobbyPlayersModal: LobbyPlayersManagingComponent;

  protected showPasswordModal: boolean;
  protected password ="";
  protected actions = [];


  constructor(private lobbyService: LobbyService,
              private router: Router,) {}

  ngOnInit() {
    this.generateActions();
  }
  generateActions() {
    // Owner actions
    if (this.isOwner(this.lobby)) {
      this.actions.push({
        label: 'Start Game',
        class: 'startbutton',
        command: () => this.startGame(this.lobby.id),
        condition: this.lobby.status !== 'started'
      });
      this.actions.push({
        label: 'Delete Lobby',
        class: 'destroybutton',
        command: () => this.destroyLobby(this.lobby.id),
        condition: this.lobby.status !== 'started' || this.lobby.status === 'started'
      });
      this.actions.push({
        label: 'Manage the players in the lobby',
        class: 'botbutton',
        command: () => this.managePlayers(this.lobby.id),
        condition: this.lobby.status !== 'started'  || this.lobby.status === 'started'
      });
      this.actions.push({
        label: 'Modify lobby settings',
        class: 'modification',
        command: () => this.modifyLobbySettings(this.lobby.id),
        condition: this.lobby.status !== 'started'
      });
      this.actions.push({
        label: 'Jump to Game Window',
        class: 'jumptogame',
        command: () => this.jumpToGame(this.lobby.id),
        condition: this.lobby.status === 'started',
      });
    }

    // Non-owner actions no password
    if (!this.isOwner(this.lobby)&& this.lobby.password == null) {
      this.actions.push({
        label: 'Join',
        class: 'joinbutton',
        command: () => this.joinLobby(this.lobby.id),
        condition: !this.isUserInLobby(this.lobby) && !this.isUserSpectatingLobby(this.lobby) && this.lobby.status !== 'started',
      });
      this.actions.push({
        label: 'Join as Spectator',
        class: 'spectatebutton',
        command: () => this.joinAsSpectator(this.lobby.id),
        condition: !this.isUserInLobby(this.lobby) && !this.isUserSpectatingLobby(this.lobby) && this.lobby.status !== 'started',
      });
      this.actions.push({
        label: 'Leave',
        class: 'leavebutton',
        command: () => this.leaveLobby(this.lobby.id),
        condition: this.isUserInLobby(this.lobby) && !this.isUserSpectatingLobby(this.lobby) && this.lobby.status !== 'started',
      });
      this.actions.push({
        label: 'Stop Spectating',
        class: 'stopspectatebutton',
        command: () => this.leaveAsSpectator(this.lobby.id),
        condition: this.isUserSpectatingLobby(this.lobby)
      });
      this.actions.push({
        label: 'Jump to Game Window',
        class: 'jumptogame',
        command: () => this.jumpToGame(this.lobby.id),
        condition: this.lobby.status === 'started'
      });
    }

    // Private non-owner actions with password
    if (!this.isOwner(this.lobby) && this.lobby.password != null) {
      this.actions.push({
        label: 'This lobby is password protected, click here to type in password',
        class: 'spectatebutton',
        command: () => this.openPasswordModal(),
        condition: !this.isUserInLobby(this.lobby) && !this.isUserSpectatingLobby(this.lobby) && this.lobby.status !== 'started',
      });
      this.actions.push({
        label: 'Leave',
        class: 'leavebutton',
        command: () => this.leaveLobby(this.lobby.id),
        condition: this.isUserInLobby(this.lobby) && this.lobby.status !== 'started',
      });
      this.actions.push({
        label: 'Stop Spectating',
        class: 'stopspectatebutton',
        command: () => this.leaveAsSpectator(this.lobby.id),
        condition: this.isUserSpectatingLobby(this.lobby)
      });
      this.actions.push({
        label: 'Jump to Game Window',
        class: 'jumptogame',
        command: () => this.jumpToGame(this.lobby.id),
        condition: this.lobby.status === 'started'
      });
    }

    return this.actions;
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


  startGame(lobbyId: string) {
    let players;
    if (this.usersLobby) {
      if (this.usersLobby && this.usersLobby.players) {
        players = this.usersLobby.players;
        console.log(this.usersLobby)
        console.log('Játékosok:', players);
        console.log(this.usersLobby.minPlayers)
        if (players.length < this.usersLobby.minPlayers) {
          console.log('Nincs elég játékos a játék indításához. Minimum '+this.usersLobby.minPlayers+' játékos szükséges.');
          return;
        }
        if (players.length > this.usersLobby.maxPlayers) {
          console.log('Maximum '+this.usersLobby.minPlayers+' játékos lehet a váróban, hogy elinduljon a játék.');
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
        this.jumpToGame(lobbyId);
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



  destroyLobby(lobbyId: string) {
    this.joinedLobby = null;
    this.lobbyService.destroyLobby(lobbyId).then(() => {
      console.log('Lobby destroyed');
    });
  }

  addBot(lobbyId: string) {
    console.log('Később valósítjuk meg.');
    this.lobbyService.addBot(lobbyId).then(() => {
      console.log('Bot added to lobby');
    });
  }

  kickUser(lobbyId: string) {
    console.log('Később valósítjuk meg.');
  }

  joinLobby(lobbyId: string) {
    this.joinedLobby = lobbyId;
    this.lobbyService.joinLobby(lobbyId, this.currentUser).then(() => {
      console.log('Joined lobby');
    });
  }

  joinAsSpectator(lobbyId: string) {
    this.joinedLobby = lobbyId;
    this.lobbyService.addSpectator(lobbyId, this.currentUser).then(() => {
      console.log('Joined as spectator');
    });
  }

  leaveAsSpectator(lobbyId: string) {
    this.joinedLobby = null;
    this.lobbyService.removeSpectator(lobbyId, this.currentUser).then(() => {
      console.log('stopped spectating');
    });
  }

  leaveLobby(lobbyId: string) {
    this.joinedLobby = null;
    this.lobbyService.leaveLobby(lobbyId, this.currentUser).then(() => {
      console.log('Left lobby');
    });
  }

  jumpToGame(lobbyId: string) {
    console.log(['/game/' + lobbyId])
    this.router.navigate(['/game/' + lobbyId]);
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


  joinWithPassword(lobbyId: string) {
    if (this.isPasswordCorrect(lobbyId, this.password)) {
      this.joinLobby(lobbyId);
      this.closePasswordModal();
    } else {
      console.error('Incorrect password');
    }
  }

  joinWithPasswordAsSpectator(lobbyId: string) {
    if (this.isPasswordCorrect(lobbyId, this.password)) {
      this.joinAsSpectator(lobbyId);
      this.closePasswordModal();
    } else {
      console.error('Incorrect password');
    }
  }

  openPasswordModal() {
    this.passwrodModal.present();
  }

  closePasswordModal() {
    this.passwrodModal.dismiss();
  }


  private isPasswordCorrect(lobbyId: string, password: string): boolean {
    console.log(password)
    console.log(this.getLobbyPassword(lobbyId))
    return password === this.getLobbyPassword(lobbyId);
  }

  private getLobbyPassword(lobbyId: string): string {
    return this.lobby.password;
  }

  private managePlayers(lobbyId: string) {
    this.lobbyPlayersModal.open();
  }

  private modifyLobbySettings(lobbyId: string) {
    this.createLobbyModal.open(lobbyId);
  }
}
