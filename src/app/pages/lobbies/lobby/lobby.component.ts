import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {Lobby} from "../../../shared/models/lobby.model";
import {User} from "../../../shared/models/user.model";
import {LobbyService} from "../../../shared/services/lobby.service";
import {Router} from "@angular/router";
import {IonModal} from "@ionic/angular";
import {CreateLobbyModalComponent} from "../create-lobby-modal/create-lobby-modal.component";
import {LobbyPlayersManagingComponent} from "../lobby-players-managing-modal/lobby-players-managing.component";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {GameStartService} from "../../../shared/services/game-services/gameStart.service";
import {ModalService} from "../../../shared/services/modal-services/modal.service";

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class LobbyComponent implements OnInit, OnDestroy, OnChanges {
  private CATEGORY = "lobby"
  @ViewChild('modal') passwordModal: IonModal;
  @ViewChild(CreateLobbyModalComponent) createLobbyModal: CreateLobbyModalComponent;
  @ViewChild(LobbyPlayersManagingComponent) lobbyPlayersModal: LobbyPlayersManagingComponent;
  @Input() lobby: any;
  @Input() hasLobby: boolean = false;
  @Input() joinedLobby: string = null;
  @Input() userId: string = null;
  @Input() currentUser: User = null;
  @Input() usersLobby!: Lobby;
  @Input() listLive: boolean;
  protected password = "";
  protected actions = [];
  protected passwordModalOpen: boolean = false;
  protected isCreateLobbyModalVisible: boolean = false;
  protected isLobbyPlayersModalVisible: boolean = false;
  isPlayersModalOpen: boolean;


  constructor(private lobbyService: LobbyService,
              private router: Router,
              private tracker: SubscriptionTrackerService,
              private gameStartService: GameStartService,
              private modalService: ModalService
  ) {
  }

  async ngOnInit() {
    //this.generateActions(this.listLive);
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['listLive'] && changes['listLive'].firstChange || changes['lobby']) {
      this.generateActions(this.listLive);
    }
  }

  generateActions(listLive: boolean) {
    if (this.lobby.status !== 'test' && !this.isUserBanned()) {
      this.actions = [];
      // Owner actions
      if (listLive && (this.isOwner())) {
        this.actions.push({
          label: 'START_GAME',
          class: 'btn-start-game',
          command: () => this.startGame(this.lobby.id),
          condition: this.lobby.status !== 'started',
          disabled: false // TODO: Ha megvalósítjuk azt, hogy a játékosoknak el kell fogadnia akkor addig ez disabled ( és akkor is ha nincs megfelelő számú játékos)
        });
        this.actions.push({
          label: 'DELETE_LOBBY',
          class: 'btn-delete-lobby',
          command: () => this.destroyLobby(this.lobby.id),
          condition: this.lobby.status !== 'started' || this.lobby.status === 'started'
        });
        this.actions.push({
          label: 'MANAGE_PLAYERS',
          class: 'btn-manage-users',
          command: () => this.managePlayers(),
          condition: this.lobby.status !== 'started' || this.lobby.status === 'started'
        });
        this.actions.push({
          label: 'EDIT_LOBBY_SETTINGS',
          class: 'btn-edit-lobby-settings',
          command: () => this.modifyLobbySettings(this.lobby.id),
          condition: this.lobby.status !== 'started'
        });
        this.actions.push({
          label: 'OPEN_GAME',
          class: 'btn-open-game',
          command: () => this.gameStartService.openGameWindow(this.lobby.id),
          condition: this.lobby.status === 'started',
        });
      }

      if (listLive && (!this.isOwner() && this.lobby.password == null)) {
        this.actions.push({
          label: 'JOIN_AS_PLAYER',
          class: 'btn-join-game',
          command: () => this.joinLobby(this.lobby.id),
          condition: !this.isUserInLobby() && !this.isUserSpectatingLobby() && this.lobby.status !== 'started',
        });
        this.actions.push({
          label: 'START_SPECTATING',
          class: 'btn-start-spectating',
          command: () => this.joinAsSpectator(this.lobby.id),
          condition: !this.isUserInLobby() && !this.isUserSpectatingLobby() && this.lobby.status !== 'started' && this.lobby.allowSpectators === true,
        });
        this.actions.push({
          label: 'LEAVE_GAME',
          class: 'btn-leave-game',
          command: () => {this.leaveLobby(this.lobby.id); console.log("ELSO")},
          condition: this.isUserInLobby() && !this.isUserSpectatingLobby() && this.lobby.status !== 'started',
        });
        this.actions.push({
          label: 'STOP_SPECTATING',
          class: 'btn-stop-spectating',
          command: () => this.leaveAsSpectator(this.lobby.id),
          condition: this.isUserSpectatingLobby()
        });
        this.actions.push({
          label: 'VIEW_GAME',
          class: 'btn-view-game',
          command: () => this.gameStartService.openSpectatorWindow(this.lobby.id),
          condition: this.lobby.status === 'started' && this.isUserSpectatingLobby(),
        });
        this.actions.push({
          label: 'OPEN_GAME',
          class: 'btn-open-game',
          command: () => this.gameStartService.openGameWindow(this.lobby.id),
          condition: this.lobby.status === 'started' && !this.isUserSpectatingLobby() && this.isUserInLobby(),
        });
        this.actions.push({
          label: 'START_SPECTATING',
          class: 'btn-start-spectating',
          command: () => this.joinAsSpectator(this.lobby.id),
          condition: this.lobby.status === 'started' && !this.isUserSpectatingLobby() && !this.isUserInLobby() && this.lobby.allowSpectators === true,
        });

      }

      // Private non-owner actions with password
      if (listLive && (!this.isOwner() && this.lobby.password != null)) {
        this.actions.push({
          label: 'PASSWORD_PROTECTED_LOBBY',
          class: 'btn-password-protected',
          command: () => this.openPasswordModal(),
          condition: !this.isUserInLobby() && !this.isUserSpectatingLobby() && this.lobby.status !== 'started',
        });
        this.actions.push({
          label: 'LEAVE_GAME',
          class: 'btn-leave-game',
          command: () => this.leaveLobby(this.lobby.id),
          condition: this.isUserInLobby() && this.lobby.status !== 'started',
        });
        this.actions.push({
          label: 'STOP_SPECTATING',
          class: 'btn-stop-spectating',
          command: () => this.leaveAsSpectator(this.lobby.id),
          condition: this.isUserSpectatingLobby()
        });
        this.actions.push({
          label: 'OPEN_GAME',
          class: 'btn-open-game',
          command: () => this.gameStartService.openGameWindow(this.lobby.id),
          condition: this.lobby.status === 'started' && this.isUserInLobby(),
        });
        this.actions.push({
          label: 'VIEW_GAME',
          class: 'btn-view-game',
          command: () => this.gameStartService.openSpectatorWindow(this.lobby.id),
          condition: this.lobby.status === 'started' && this.isUserSpectatingLobby(),
        });
        this.actions.push({
          label: 'START_SPECTATING',
          class: 'btn-start-spectating',
          command: () => this.joinAsSpectator(this.lobby.id),
          condition: this.lobby.status === 'started' && !this.isUserSpectatingLobby() && !this.isUserInLobby() && this.lobby.allowSpectators === true,
        });
      }


      if (!listLive) {
        this.actions.push({
          label: 'START_SPECTATING',
          class: 'btn-start-spectating',
          command: () => this.joinAsSpectator(this.lobby.id),
          condition: !this.isUserSpectatingLobby() && this.lobby.allowSpectators === true,
        });
        this.actions.push({
          label: 'STOP_SPECTATING',
          class: 'btn-stop-spectating',
          command: () => this.leaveAsSpectator(this.lobby.id),
          condition: this.isUserSpectatingLobby(),
        });
        this.actions.push({
          label: 'VIEW_GAME',
          class: 'btn-view-game',
          command: () => this.gameStartService.openSpectatorReplayWindow(this.lobby.id),
          condition: this.lobby.status === 'ended' && this.isUserSpectatingLobby(),
        });
      }
    }

    if (this.lobby.status === 'test') {
      this.actions.push({
        label: 'VIEW_GAME',
        class: 'btn-view-game',
        command: () => console.log("View game"),
        condition: true,
      });
      this.actions.push({
        label: 'START_SPECTATING',
        class: 'btn-start-spectating',
        command: () => console.log("Start spectating"),
        condition: true,
      });
      this.actions.push({
        label: 'STOP_SPECTATING',
        class: 'btn-stop-spectating',
        command: () => console.log("Stop spectating"),
        condition: true,
      });
      this.actions.push({
        label: 'JOIN_AS_PLAYER',
        class: 'btn-join-game',
        command: () => console.log("Join as player"),
        condition: true,
      });
      this.actions.push({
        label: 'LEAVE_GAME',
        class: 'btn-leave-game',
        command: () => console.log("Leave game"),
        condition: true,
      });
      this.actions.push({
        label: 'OPEN_GAME',
        class: 'btn-open-game',
        command: () => console.log("Open game"),
        condition: true,
      });
      this.actions.push({
        label: 'EDIT_LOBBY_SETTINGS',
        class: 'btn-edit-lobby-settings',
        command: () => console.log("Edit lobby settings"),
        condition: true,
      });
      this.actions.push({
        label: 'MANAGE_PLAYERS',
        class: 'btn-manage-users',
        command: () => console.log("Manage players"),
        condition: true,
      });
      this.actions.push({
        label: 'DELETE_LOBBY',
        class: 'btn-delete-lobby',
        command: () => console.log("Delete lobby"),
        condition: true,
      });
      this.actions.push({
        label: 'READY_UP',
        class: 'btn-ready-up',
        command: () => console.log("Ready up"),
        condition: true,
      });
      this.actions.push({
        label: 'START_GAME',
        class: 'btn-start-game',
        command: () => console.log("Start game"),
        condition: true,
      });
      this.actions.push({
        label: 'PASSWORD_PROTECTED_LOBBY',
        class: 'btn-password-protected',
        command: () => console.log("Password protected"),
        condition: true,
      });
    }

    return this.actions;
  }

  private isUserBanned() {
    return this.lobby.bannedPlayers.includes(this.userId);
  }


  isOwner(): boolean {
    return this.lobby.ownerId === this.userId;
  }

  isUserInLobby(): boolean {
    return this.lobby.players.includes(this.userId);
  }

  isUserSpectatingLobby(): boolean {
    return this.lobby.spectators.includes(this.userId);
  }


  startGame(lobbyId: string) {
    let players: string[];
    if (this.usersLobby) {
      if (this.usersLobby && this.usersLobby.players) {
        players = this.usersLobby.players;
        if (players.length < this.usersLobby.minPlayers) {
          console.log('Nincs elég játékos a játék indításához. Minimum ' + this.usersLobby.minPlayers + ' játékos szükséges.');
          return;
        }
        if (players.length > this.usersLobby.maxPlayers) {
          console.log('Maximum ' + this.usersLobby.minPlayers + ' játékos lehet a váróban, hogy elinduljon a játék.');
          return;
        }
        this.usersLobby.status = "starting";
        this.lobbyService.lobbyCooldown(this.lobby.id);
        this.gameStartService.handleCountdown(() => this.lobbyService.startGame(this.usersLobby), lobbyId, false);
      }
    }
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

  joinLobby(lobbyId: string) {
    this.joinedLobby = lobbyId;
    this.lobbyService.joinLobby(lobbyId, this.currentUser).then(() => {

      this.gameStartService.watchLobbyAsPlayer(lobbyId, this.currentUser.id);

      console.log('Joined lobby');
    });
  }

  joinAsSpectator(lobbyId: string) {
    this.joinedLobby = lobbyId;
    this.lobbyService.addSpectator(lobbyId, this.currentUser).then(() => {

      this.gameStartService.watchLobbyAsPlayer(lobbyId, this.currentUser.id);

      console.log('Joined as spectator');
    });
  }

  leaveAsSpectator(lobbyId: string) {
    this.joinedLobby = null;
    this.lobbyService.removeSpectator(lobbyId, this.currentUser).then(() => {

      this.gameStartService.stopWatchingLobby(lobbyId);

      console.log('stopped spectating');
    });
  }

  leaveLobby(lobbyId: string) {
    this.joinedLobby = null;
    this.lobbyService.leaveLobby(lobbyId, this.currentUser).then(() => {

      this.gameStartService.stopWatchingLobby(lobbyId);

      console.log('Left lobby');
    });
  }

  getLobbyBackgroundColor(lobby: Lobby): string {
    if (this.isOwner()) {
      return 'blue';
    } else if (lobby.status === 'started') {
      return 'gray';
    } else if (lobby.private) {
      return 'red';
    } else if (lobby.status === 'ended') {
      return 'orange';
    } else if (lobby.id === this.currentUser.inLobby) {
      return 'white';
    } else if (this.isUserBanned()){
      return 'magenta';
    } else{
      return 'green';
    }
  }


  joinWithPassword(lobbyId: string) {
    if (this.isPasswordCorrect(this.password)) {
      this.joinLobby(lobbyId);
      this.closePasswordModal();
    } else {
      console.error('Incorrect password');
    }
  }

  joinWithPasswordAsSpectator(lobbyId: string) {
    if (this.isPasswordCorrect(this.password)) {
      this.joinAsSpectator(lobbyId);
      this.closePasswordModal();
    } else {
      console.error('Incorrect password');
    }
  }

  openPasswordModal() {
    this.passwordModalOpen = true;
    this.passwordModal.present();
  }

  closePasswordModal() {
    this.passwordModalOpen = false;
    this.passwordModal.dismiss();
  }

  closeCreateLobbyModal() {
    this.isCreateLobbyModalVisible = false;
  }

  closeLobbyPlayersModal() {
    this.isLobbyPlayersModalVisible = false;
  }


  private isPasswordCorrect(password: string): boolean {
    return password === this.getLobbyPassword();
  }

  private getLobbyPassword(): string {
    return this.lobby.password;
  }

  managePlayers() {
    this.isLobbyPlayersModalVisible = true;
    this.modalService.openModal('managePlayers', {
      currentUser: this.currentUser,
      lobbyId: this.lobby.id
    });
  }

  modifyLobbySettings(lobbyId: string) {
    this.isCreateLobbyModalVisible = true;
    this.modalService.openModal('createLobby', {
      currentUser: this.currentUser,
      lobby: this.lobby
    });
  }
}
