import {Component, ViewChild, Output, EventEmitter, Input, OnInit, OnDestroy} from '@angular/core';
import {IonModal} from '@ionic/angular';
import {CreateLobbyData} from '../../../shared/models/create-lobby.interface';
import {LobbyService} from "../../../shared/services/lobby.service";
import {Lobby} from "../../../shared/models/lobby.model";
import {User} from "../../../shared/models/user.model";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {Game} from "../../../shared/models/game.model";
import {LanguageService} from "../../../shared/services/language.service";
import {AlertService} from "../../../shared/services/alert.service";
import * as bcrypt from 'bcryptjs';

@Component({
  selector: 'app-create-lobby-modal',
  templateUrl: './create-lobby-modal.component.html',
  styleUrls: ['./create-lobby-modal.component.scss']
})

export class CreateLobbyModalComponent implements OnInit, OnDestroy {
  private CATEGORY = "create-lobby-modal"
  @Input() currentUser: User;
  @Input() lobby: Lobby | null;
  @ViewChild('createLobbyModal') modal: IonModal;
  @Output() createLobbyEvent = new EventEmitter<CreateLobbyData>();
  @Output() closeModal = new EventEmitter<void>();

  selectedGame: any;
  lobbyName: string = '';
  maxRounds: number = 1;
  allowSpectators: boolean = true;
  private: boolean = false;
  enablePassword: boolean = false;
  password: string = '';
  enablePlayerNumbers: boolean = false;
  minPlayers: number = 2;
  maxPlayers: number = 2;
  minGAMENumber: number = 2;
  maxGAMENumber: number = 8;
  isButtonDisabled: boolean = false;
  cooldownTime: number = 500;
  lobbyId: string;
  ownerId: string;
  ownerName: string;
  status: string;
  hasBots: boolean;
  gameType: string;
  currentRound: number;
  gameModifiers: { [p: string]: any };
  games$: Promise<Game[]>;

  players: string[];
  playerNames: string[];
  spectators: string[];
  spectatorNames: string[];
  bannedPlayers: string[];
  bannedPlayerNames: string[];


  constructor(private lobbyService: LobbyService,
              private tracker: SubscriptionTrackerService,
              private languageService: LanguageService,
              private alertService: AlertService,
  ) {
    this.games$ = this.lobbyService.getGameTypes();

  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  async ngOnInit() {
    setTimeout(async () => {
      await this.initializeModal();
    });
  }

  private async initializeModal() {
    if (this.lobby) {
      this.lobbyId = this.lobby.id;
      this.lobbyName = this.lobby.name;
      this.ownerId = this.lobby.ownerId;
      this.ownerName = this.lobby.ownerName;
      this.status = this.lobby.status;
      this.maxRounds = this.lobby.maxRounds;
      this.allowSpectators = this.lobby.allowSpectators;
      this.private = this.lobby.private;
      this.enablePassword = !!this.lobby.password;
      this.password = '';
      this.enablePlayerNumbers = this.lobby.minPlayers !== this.lobby.maxPlayers;
      this.minPlayers = this.lobby.minPlayers;
      this.maxPlayers = this.lobby.maxPlayers;
      this.hasBots = this.lobby.hasBots;
      this.gameType = this.lobby.gameType;
      this.spectators = this.lobby.spectators;
      this.currentRound = this.lobby.currentRound;
      this.gameModifiers = this.lobby.gameModifiers || {};
      this.playerNames = this.lobby.playerNames;
      this.spectatorNames = this.lobby.spectatorNames;
      this.bannedPlayers = this.lobby.bannedPlayers;
      this.bannedPlayerNames = this.lobby.bannedPlayerNames;
      this.players = this.lobby.players;

      const games = await this.games$;
      this.selectedGame = games.find(game => game.name === this.lobby.gameType);
      this.maxGAMENumber = this.selectedGame.maxPlayers;
      this.minGAMENumber = this.selectedGame.minPlayers;
    }

    if (this.modal) {
      await this.modal.present();
    } else {
      console.error('Modal not initialized');
    }
  }

  close() {
    this.lobbyId = null;
    if (this.modal) {
      this.closeModal.emit();
      this.modal.dismiss().then(() => {});
    }
  }

  async createLobby() {
    if (this.isButtonDisabled) {
      return;
    }

    if (!this.currentUser) {
      console.error('No user is logged in.');
      return;
    }

    let warningMessages = [];
    let shouldWarn = false;


    if (this.maxRounds % 2 === 0) {
      warningMessages.push(`- ${this.languageService.translate("EVEN_ROUNDS_WARNING")}`);
      shouldWarn = true;
    }

    if (this.maxRounds > 5) {
      warningMessages.push(`- ${this.languageService.translate("LONG_GAME_WARNING")}`);
      shouldWarn = true;
    }

    if (this.minPlayers < this.selectedGame.minPlayers) {
      warningMessages.push(`- ${this.languageService.translate("TOO_LITTLE_PLAYERS")} (${this.selectedGame.minPlayers})`);
      shouldWarn = true;
    }

    if (this.maxPlayers > this.selectedGame.maxPlayers) {
      warningMessages.push(`- ${this.languageService.translate("TOO_MANY_PLAYERS")} (${this.selectedGame.maxPlayers})`);
      shouldWarn = true;
    }

    if (this.minPlayers > this.selectedGame.maxPlayers) {
      warningMessages.push(`- ${this.languageService.translate("TOO_MANY_MIN_PLAYERS")} (${this.selectedGame.minPlayers})`);
      shouldWarn = true;
    }

    if (this.maxPlayers < this.selectedGame.minPlayers) {
      warningMessages.push(`- ${this.languageService.translate("TOO_MANY_PLAYERS")} (${this.selectedGame.maxPlayers})`);
      shouldWarn = true;
    }

    if (this.maxPlayers < this.minPlayers) {
      warningMessages.push(`- ${this.languageService.translate("PLAYER_NUMBERS_WRONG")} (${this.selectedGame.maxPlayers})`);
      shouldWarn = true;
    }


    if (shouldWarn) {
      const message = `${this.languageService.translate("WARNINGS_NOTIFIER")}:\n\n` +
        warningMessages.join('\n') +
        "\n\n" + `${this.languageService.translate("ARE_YOU_SURE_CREATION")}?`;

      if (confirm(message)) {
        await this.proceedWithLobbyCreation();
      }
      return;
    }

    await this.proceedWithLobbyCreation();
  }

  private async proceedWithLobbyCreation() {
    if (this.selectedGame == null || this.lobbyName == null || this.maxRounds == null) {
      return false;
    }

    if (this.enablePassword && this.password.length < 6) {
      await this.alertService.showAlert(
        `${this.languageService.translate("ERROR")}`,
        `${this.languageService.translate("WEAK_PASSWORD")}`);
      return false;
    }
    this.minGAMENumber = this.selectedGame.minPlayers;
    this.maxGAMENumber = this.selectedGame.maxPlayers;
    console.log("this.maxGAMENumber: ", this.maxGAMENumber)
    console.log("this.minPlayers: ", this.minPlayers)

    let minNumber= Math.max(this.minPlayers, this.minGAMENumber, 2);
    let maxNumber= Math.min(this.maxPlayers, this.maxGAMENumber, 8);

    if (minNumber > maxNumber) {
      minNumber = maxNumber;
    }

    this.isButtonDisabled = true;


    if (!this.lobby) {
      this.players = [this.currentUser.id];
      this.playerNames = [this.currentUser.username];
      this.status = "setup";
      this.hasBots = false;
      this.spectators = [];
      this.spectatorNames = [];
      this.bannedPlayers = [];
      this.bannedPlayerNames = [];
      this.gameModifiers = {};
    }


    const lobbyData: Omit<Lobby, 'id'> = {
      name: this.lobbyName,
      ownerName: this.currentUser.username,
      ownerId: this.currentUser.id,
      status: this.status,
      maxRounds: this.maxRounds,
      gameType: this.selectedGame.name,
      minPlayers: minNumber,
      maxPlayers: maxNumber,
      hasBots: this.hasBots,
      gameModifiers: this.gameModifiers,
      currentRound: 0,
      password: this.enablePassword ? await this.hashPassword(this.password) : null,
      private: this.private,
      allowSpectators: this.allowSpectators,
      players: this.players,
      playerNames: this.playerNames,
      spectators:  this.spectators,
      spectatorNames: this.spectatorNames,
      bannedPlayers: this.bannedPlayers,
      bannedPlayerNames: this.bannedPlayerNames,
    };

    if(this.lobbyId && !this.allowSpectators && this.spectators.length > 0){
      this.lobbyService.removeSpectatorsTags(lobbyData);
      lobbyData.spectators = [];
      lobbyData.spectatorNames = [];
    }

    try {
      if (this.lobbyId) {
        await this.lobbyService.updateLobby(this.lobbyId, lobbyData);
        console.log('Lobby updated with ID:', this.lobbyId);
      } else {
        const docRef = await this.lobbyService.createLobby(lobbyData, this.currentUser.id);
        console.log('Lobby created with ID:', docRef.id);
      }

      setTimeout(() => {
        this.isButtonDisabled = false;
      }, this.cooldownTime);
      this.createLobbyEvent.emit(lobbyData);
      this.closeModal.emit();
    } catch (error) {
      console.error('Error creating/updating lobby:', error);
    }
    await this.modal.dismiss();
  }



  private async hashPassword(password: string) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }
}
