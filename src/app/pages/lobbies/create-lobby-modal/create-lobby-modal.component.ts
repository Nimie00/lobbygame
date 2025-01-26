import {Component, ViewChild, Output, EventEmitter, Input, OnInit, OnDestroy} from '@angular/core';
import {IonModal} from '@ionic/angular';
import {CreateLobbyData} from '../../../shared/models/create-lobby.interface';
import {LobbyService} from "../../../shared/services/lobby.service";
import {Lobby} from "../../../shared/models/lobby.model";
import {User} from "../../../shared/models/user.model";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {Game} from "../../../shared/models/game.model";
import {LanguageService} from "../../../shared/services/language.service";

@Component({
  selector: 'app-create-lobby-modal',
  templateUrl: './create-lobby-modal.component.html',
  styleUrls: ['./create-lobby-modal.component.scss']
})
export class CreateLobbyModalComponent implements OnInit, OnDestroy {
  private CATEGORY = "create-lobby-modal"
  @Input() currentUser: User; // Adat fogadása
  @Input() lobby: Lobby | null; // Adat fogadása
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
              private translateSerice: LanguageService,

) {
    this.games$ = this.lobbyService.getGames();

  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  async ngOnInit() {
    // Várunk egy ticket, hogy a ViewChild betöltődjön
    setTimeout(async () => {
      await this.initializeModal();
    });
  }

  private async initializeModal() {
    if (this.lobby) {
      // Ha van lobby, akkor feltöltjük az adatokat
      this.lobbyId = this.lobby.id;
      this.lobbyName = this.lobby.name;
      this.ownerId = this.lobby.ownerId;
      this.ownerName = this.lobby.ownerName;
      this.status = this.lobby.status;
      this.maxRounds = this.lobby.maxRounds;
      this.allowSpectators = this.lobby.allowSpectators;
      this.private = this.lobby.private;
      this.enablePassword = !!this.lobby.password;
      this.password = this.lobby.password || '';
      this.enablePlayerNumbers = this.lobby.minPlayers !== this.lobby.maxPlayers;
      this.minPlayers = this.lobby.minPlayers;
      this.maxPlayers = this.lobby.maxPlayers;
      this.hasBots = this.lobby.hasBots;
      this.gameType = this.lobby.gameType;
      this.spectators = this.lobby.spectators;
      this.currentRound = this.lobby.currentRound;
      this.gameModifiers = this.lobby.gameModifiers;
      this.playerNames = this.lobby.playerNames;
      this.spectatorNames = this.lobby.spectatorNames;
      this.bannedPlayers = this.lobby.bannedPlayers;
      this.bannedPlayerNames = this.lobby.bannedPlayerNames;
      this.players = this.lobby.players;

      // Kiválasztjuk a megfelelő játékot
      this.gameModifiers["timed"] = 300;
      const games = await this.games$;
      this.selectedGame = games.find(game => game.name === this.lobby.gameType);
    }

    if (this.modal) {
      await this.modal.present();
    } else {
      console.error('Modal not initialized');
    }
  }

  close() {
    this.closeModal.emit();
    this.lobbyId = null;
    if (this.modal) {
      this.modal.dismiss();
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


    // Összegyűjtjük az összes figyelmeztetést
    if (this.maxRounds % 2 === 0) {
      warningMessages.push(`- ${this.translateSerice.translate("EVEN_ROUNDS_WARNING")}`);
      shouldWarn = true;
    }

    if (this.maxRounds > 5) {
      warningMessages.push(`- ${this.translateSerice.translate("LONG_GAME_WARNING")}`);
      shouldWarn = true;
    }

    if (shouldWarn) {
      const message = `${this.translateSerice.translate("WARNINGS_NOTIFIER")}:\n\n`+
        warningMessages.join('\n') +
        "\n\n"+`${this.translateSerice.translate("ARE_YOU_SURE_CREATION")}?`;

      if (confirm(message)) {
        console.log("Elfogadva a figyelmeztetések");
        await this.proceedWithLobbyCreation();
      }
      return;
    }

    await this.proceedWithLobbyCreation();
  }

  private async proceedWithLobbyCreation() {
    let minGAMENumber = this.selectedGame.minPlayers;
    let maxGAMENumber = this.selectedGame.maxPlayers;
    let minNumber = this.selectedGame.minPlayers;
    let maxNumber = this.selectedGame.maxPlayers;

    if (this.enablePlayerNumbers) {
      if (this.minPlayers > 0) {
        minNumber = this.minPlayers;
      }
      if (this.maxPlayers > 0) {
        maxNumber = this.maxPlayers;
      }
    }
    minNumber = Math.min(this.minPlayers, minGAMENumber,2);
    maxNumber = Math.max(this.maxPlayers, maxGAMENumber,8);

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


      this.gameModifiers.timed = 300;
      this.gameModifiers.endWhenOutOfTime = true;
    }

    const lobbyData: Omit<Lobby, 'id'> = {
      name: this.lobbyName,
      ownerName: this.currentUser.username,
      ownerId: this.currentUser.id,
      players: this.players,
      status: this.status,
      maxRounds: this.maxRounds,
      gameType: this.selectedGame.name,
      minPlayers: minNumber,
      maxPlayers: maxNumber,
      hasBots: this.hasBots,
      gameModifiers: {
        timed: 50,
        endWhenOutOfTime: true,
      },
      spectators: this.spectators,
      currentRound: 0,
      password: this.enablePassword ? this.password : null,
      private: this.private,
      allowSpectators: this.allowSpectators,
      playerNames: this.playerNames,
      spectatorNames: this.spectatorNames,
      bannedPlayers: this.bannedPlayers,
      bannedPlayerNames: this.bannedPlayerNames,
    };

    // Lobby létrehozása a backendben
    try {
      if (this.lobbyId) {
        await this.lobbyService.updateLobby(this.lobbyId, lobbyData);
        console.log('Lobby updated with ID:', this.lobbyId);
      } else {
        const docRef = await this.lobbyService.createLobby(lobbyData, this.currentUser.id);
        console.log('Lobby created with ID:', docRef.id);
      }

      // Event kibocsátása, ha szükséges
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
}
