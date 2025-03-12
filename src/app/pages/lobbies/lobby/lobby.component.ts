import {
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
import {CreateLobbyModalComponent} from "../create-lobby-modal/create-lobby-modal.component";
import {
  LobbyPlayersManagingModalComponent
} from "../lobby-players-managing-modal/lobby-players-managing-modal.component";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {GameStartService} from "../../../shared/services/game-services/gameStart.service";
import {ModalService} from "../../../shared/services/modal.service";
import {LanguageService} from "../../../shared/services/language.service";
import {LobbyPasswordModalComponent} from "./password-modal/lobby-password-modal.component";
import {AlertService} from "../../../shared/services/alert.service";
import {Router} from "@angular/router";


@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent implements OnInit, OnDestroy, OnChanges {
  private CATEGORY = "lobby"
  @ViewChild(CreateLobbyModalComponent) createLobbyModal: CreateLobbyModalComponent;
  @ViewChild(LobbyPlayersManagingModalComponent) lobbyPlayersModal: LobbyPlayersManagingModalComponent;
  @ViewChild(LobbyPasswordModalComponent) lobbyPasswordModal: LobbyPasswordModalComponent;
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
  debug: boolean;


  constructor(private lobbyService: LobbyService,
              private tracker: SubscriptionTrackerService,
              private gameStartService: GameStartService,
              private languageService: LanguageService,
              private modalService: ModalService,
              private alertService: AlertService,
              private router: Router,
  ) {

  }

  ngOnInit() {}

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.debug = localStorage.getItem('debug') == 'true';
    if (changes['listLive'] && changes['listLive'].firstChange || changes['lobby']) {
      this.generateActions(this.listLive);
    }
  }

  generateActions(listLiveGames: boolean) {
    if (this.lobby.status !== 'test' && !this.isUserBanned()) {
      this.actions = [];
      if (listLiveGames && (this.isOwner())) {
        this.actions.push({
          label: 'START_GAME',
          class: 'btn-start-game',
          command: () => this.startGame(this.lobby.id),
          condition: this.lobby.status !== 'started',
          disabled: false
        });
        this.actions.push({
          label: 'OPEN_GAME',
          class: 'btn-open-game',
          command: () => this.gameStartService.openGameWindow(this.lobby.id),
          condition: this.lobby.status === 'started',
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
          command: () => this.modifyLobbySettings(),
          condition: this.lobby.status !== 'started'
        });

        this.actions.push({
          label: 'DELETE_LOBBY',
          class: 'btn-delete-lobby',
          command: () => this.destroyLobby(this.lobby.id),
          condition: ((this.lobby.status !== 'started' && this.lobby.status !== 'starting') || this.debug),
        });
      }

      if (listLiveGames && (!this.isOwner() && this.lobby.password == null)) {
        this.actions.push({
          label: 'JOIN_AS_PLAYER',
          class: 'btn-join-game',
          command: () => this.joinLobby(this.lobby.id),
          condition: !this.isUserInLobby() && !this.isUserSpectatingLobby() && (this.lobby.status !== 'started' &&
            this.lobby.status !== 'starting') && this.lobby.maxPlayers > this.lobby.players.length && !this.currentUser.inLobby,
        });
        this.actions.push({
          label: 'START_SPECTATING',
          class: 'btn-start-spectating',
          command: () => this.joinAsSpectator(this.lobby.id, this.lobby.status === 'started'),
          condition: !this.isUserInLobby() && !this.isUserSpectatingLobby() && this.lobby.allowSpectators === true && !this.currentUser.inLobby,
        });

        this.actions.push({
          label: 'LEAVE_GAME',
          class: 'btn-leave-game',
          command: () => {
            this.leaveLobby(this.lobby.id);
          },
          condition: this.isUserInLobby() && !this.isUserSpectatingLobby() && this.lobby.status !== 'started' && this.lobby.status !== 'starting',
        });
        this.actions.push({
          label: 'STOP_SPECTATING',
          class: 'btn-stop-spectating',
          command: () => {
            this.leaveAsSpectator(this.lobby.id);
          },
          condition: !this.isUserInLobby() && this.isUserSpectatingLobby()
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

      }

      // Private non-owner actions with password
      if (listLiveGames && (!this.isOwner() && this.lobby.password != null)) {
        this.actions.push({
          label: 'PASSWORD_PROTECTED_LOBBY',
          class: 'btn-password-protected',
          command: () => this.openPasswordModal(),
          condition: !this.isUserInLobby() && !this.isUserSpectatingLobby()
            && !(this.lobby.maxPlayers <= this.lobby.players.length && !this.lobby.allowSpectators)
            && !this.currentUser.inLobby,
        });
        this.actions.push({
          label: 'LEAVE_GAME',
          class: 'btn-leave-game',
          command: () => this.leaveLobby(this.lobby.id),
          condition: this.isUserInLobby() && this.lobby.status !== 'started' && this.lobby.status !== 'starting',
        });
        this.actions.push({
          label: 'STOP_SPECTATING',
          class: 'btn-stop-spectating',
          command: () => {
            this.leaveAsSpectator(this.lobby.id);
          },
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
      }


      if (!listLiveGames) {
        this.actions.push({
          label: 'START_REPLAY',
          class: 'btn-start-spectating',
          command: () => this.joinAsSpectator(this.lobby.id, true),
          condition: !this.isUserSpectatingLobby() && this.lobby.allowSpectators === true && !this.currentUser.inLobby,
        });
        this.actions.push({
          label: 'STOP_SPECTATING',
          class: 'btn-stop-spectating',
          command: () => {
            this.leaveAsSpectator(this.lobby.id);
          },
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


  async startGame(lobbyId: string) {
    let players: string[];
    if (this.usersLobby) {
      if (this.usersLobby && this.usersLobby.players) {
        players = this.usersLobby.players;
        if (players.length < this.usersLobby.minPlayers) {
          await this.alertService.showAlert(
            `${this.languageService.translate("ERROR")}`,
            `${this.languageService.translate("INVALID_NUMBER_OF_USERS_LITTLE")}.`
          );
          return;
        }
        if (players.length > this.usersLobby.maxPlayers) {
          await this.alertService.showAlert(
            `${this.languageService.translate("ERROR")}`,
            `${this.languageService.translate("INVALID_NUMBER_OF_USERS_LOT")}.`
          );
          return;
        }

        if (this.usersLobby.gameType!== "RPS") {
          await this.alertService.showAlert(
            `${this.languageService.translate("ERROR")}`,
            `${this.languageService.translate("GAMETYPE_NOT_IMPLEMENTED")}.`
          );
          return;
        }

        this.usersLobby.status = "starting";
        this.lobbyService.lobbyCooldown(this.lobby.id);
        await this.gameStartService.handleCountdown(await this.lobbyService.startGame(this.usersLobby), lobbyId, false);
      }
    }
  }


  destroyLobby(lobbyId: string) {
    this.joinedLobby = null;
    this.lobbyService.destroyLobby(lobbyId).then(() => {
      console.log('Lobby destroyed');
    });
  }

  //Password Modalban is benne van, csúnya, de bonyolult lenne összekötni
  joinLobby(lobbyId: string) {
    this.joinedLobby = lobbyId;
    this.lobbyService.joinLobby(lobbyId, this.currentUser).then(() => {
    });
  }

  //Password Modalban is benne van, csúnya, de bonyolult lenne összekötni
  async joinAsSpectator(lobbyId: string, started: boolean) {
    this.joinedLobby = lobbyId;
    this.lobbyService.addSpectator(lobbyId, this.currentUser, started).then(() => {
    });
  }

  async leaveAsSpectator(lobbyId: string) {
    this.joinedLobby = null;
    await this.lobbyService.removeSpectator(lobbyId, this.currentUser);

    if (this.router.url && this.router.url.includes('replays:')) {
      await this.router.navigate(['/lobbies']);
    }

  }

  leaveLobby(lobbyId: string) {
    this.joinedLobby = null;
    console.log("Leave");
    this.lobbyService.leaveLobby(lobbyId, this.currentUser).then(() => {
      this.gameStartService.stopWatchingLobby();
    });
  }

  getLobbyStyle(lobby: Lobby): { backgroundColor: string; icon: string } {
    let backgroundColor: string;
    let icon: string;

    if (this.isUserBanned()) {
      backgroundColor = 'var(--lobby-banned-bg)';
      icon = 'ban';
    } else if (lobby.status === 'ended') {
      backgroundColor = 'var(--lobby-ended-bg)';
      icon = 'stop';
    } else if (this.isOwner()) {
      backgroundColor = 'var(--lobby-owner-bg)';
      icon = 'star';
    } else if (lobby.status === 'started') {
      backgroundColor = 'var(--lobby-started-bg)';
      icon = 'play';
    } else if (lobby.id === this.currentUser.inLobby) {
      backgroundColor = 'var(--lobby-joined-bg)';
      icon = 'checkmark-circle';
    } else if (lobby.private) {
      backgroundColor = 'var(--lobby-private-bg)';
      icon = 'shield';
    } else {
      backgroundColor = 'var(--lobby-default-bg)';
      icon = 'help-circle';
    }

    return {backgroundColor, icon};
  }

  managePlayers() {
    this.isLobbyPlayersModalVisible = true;
    this.modalService.openModal('managePlayers', {
      currentUser: this.currentUser,
      lobbyId: this.lobby.id
    });
  }

  modifyLobbySettings() {
    this.isCreateLobbyModalVisible = true;
    this.modalService.openModal('createLobby', {
      currentUser: this.currentUser,
      lobby: this.lobby
    });
  }

  openPasswordModal() {
    this.passwordModalOpen = true;
    this.modalService.openModal('lobbyPassword', {
      currentUser: this.currentUser,
      lobby: this.lobby
    });
  }
}
