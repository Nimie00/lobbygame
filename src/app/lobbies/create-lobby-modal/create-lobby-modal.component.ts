import {Component, ViewChild, Output, EventEmitter, Input} from '@angular/core';
import {IonModal} from '@ionic/angular';
import {isEmpty, Observable} from 'rxjs';
import {CreateLobbyData} from '../../models/create-lobby.interface';
import {LobbyService} from "../../services/lobby.service";
import {Lobby} from "../../models/lobby.model";
import {User} from "../../models/user.model";

@Component({
  selector: 'app-create-lobby-modal',
  templateUrl: './create-lobby-modal.component.html',
  styleUrls: ['./create-lobby-modal.component.scss']
})
export class CreateLobbyModalComponent {
  @Input() currentUser: User; // Adat fogadása
  @Input() lobby: Lobby | null; // Adat fogadása
  @ViewChild('createLobbyModal') modal!: IonModal;
  @Output() createLobbyEvent = new EventEmitter<CreateLobbyData>();

  selectedGame: any;
  lobbyName: string = '';
  maxRounds: number = 1;
  allowSpectators: boolean = true;
  private: boolean = false;
  enablePassword: boolean = false;
  password: string = '';
  enablePlayerNumbers: boolean = false;
  minPlayers: number = 2;
  maxPlayers: number = 4;
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
  games$: Observable<any[]>;

  players: string[];
  playerNames: string[];
  spectators: string[];
  spectatorNames: string[];
  bannedPlayers: string[];
  bannedPlayerNames: string[];


  constructor(private lobbyService: LobbyService) {
    this.games$ = this.lobbyService.getGames();
  }

  close() {
    this.modal.dismiss();
    this.lobbyId = null;
  }

  async open(lobbyId?: string) {
    this.lobbyId = lobbyId;

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

    await this.modal.present();
  }

  async createLobby() {
    if (this.isButtonDisabled) {
      return; // Ha a gomb le van tiltva, ne történjen semmi
    }

    if (!this.currentUser) {
      console.error('No user is logged in.');
      return;
    }

    // Határértékek beállítása
    if (this.maxRounds > 10) {
      this.maxRounds = 10;
    }

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
    }

    // Lobby objektum létrehozása
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
      gameModifiers: this.selectedGame.gameModifiers || {},
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
        // Meglévő vári frissítése
        await this.lobbyService.updateLobby(this.lobbyId, lobbyData);
        console.log('Lobby updated with ID:', this.lobbyId);
      } else {
        // Új vári létrehozása
        const docRef = await this.lobbyService.createLobby(lobbyData, this.currentUser.id);
        console.log('Lobby created with ID:', docRef.id);
      }

      // Event kibocsátása, ha szükséges
      setTimeout(() => {
        this.isButtonDisabled = false;
      }, this.cooldownTime);
      this.createLobbyEvent.emit(lobbyData);
    } catch (error) {
      console.error('Error creating/updating lobby:', error);
    }
    await this.modal.dismiss();
  }
}
