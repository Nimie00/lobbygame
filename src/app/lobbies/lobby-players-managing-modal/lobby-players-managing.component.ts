import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {IonModal} from '@ionic/angular';
import {LobbyService} from "../../services/lobby.service";
import {User} from "../../models/user.model";
import {Lobby} from "../../models/lobby.model";
import {Router} from "@angular/router";
import {SubscriptionTrackerService} from "../../services/subscriptionTracker.service";

interface Player {
  id: string;
  username: string;
  status: 'online' | 'offline' | 'in-game';
}

@Component({
  selector: 'app-lobby-players-managing',
  templateUrl: './lobby-players-managing.component.html',
  styleUrls: ['./lobby-players-managing.component.scss']
})
export class LobbyPlayersManagingComponent {
  private CATEGORY = "lobby-player-managing-modal"
  @ViewChild('lobbyPlayersModal') modal!: IonModal;
  @Input() lobby: Lobby;
  @Input() currentUser: User = null;
  @Output() closeModal = new EventEmitter<void>();
  players: string[] = [];
  playerNames: string[] = [];
  bannedPlayers: string[] = [];
  bannedPlayerNames: string[] = [];
  routertext: string = "";


  constructor(private lobbyService: LobbyService,
              private router: Router,
              private tracker: SubscriptionTrackerService,
  ) {
  }

  ngOnInit() {
    if (this.lobby) {
      this.initializePlayers();
      this.routertext = window.location.pathname + '/';
      if (this.routertext.includes(this.lobby.id)) {
        this.routertext = this.routertext.split(this.lobby.id)[0];
      }
      this.routertext = window.location.host + this.routertext
    }
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }


  private initializePlayers() {
    this.players = this.lobby.players || [];
    this.bannedPlayers = this.lobby.bannedPlayers || [];
    this.playerNames = this.lobby.playerNames || [];
    this.bannedPlayerNames = this.lobby.bannedPlayerNames || [];
  }

  close() {
    this.closeModal.emit();
    this.modal.dismiss();
  }

  open() {
    if (this.lobby) {
      this.initializePlayers(); // Frissítjük az adatokat amikor megnyitjuk a modalt
    }
    this.modal.present();
  }

  async renamePlayer(playerId: string, playerName: string) {
    console.log(playerId + " renameplayer")
    await this.lobbyService.renameUser(this.lobby.id, playerId, playerName);
  }

  async kickPlayer(playerId: string, playerName: string) {
    console.log(playerId + " kickplayer")
    await this.lobbyService.kickUser(this.lobby.id, playerId, playerName);
  }

  async banPlayer(playerId: string, playerName: string) {
    console.log(playerId + " banplayer")
    await this.lobbyService.banPlayer(this.lobby.id, playerId, playerName);
  }

  async unbanPlayer(playerId: string, playerName: string) {
    console.log(playerId + " unbanplayer")
    await this.lobbyService.unbanPlayer(this.lobby.id, playerId, playerName);
  }

  async promotePlayer(playerId: string, playerName: string) {
    console.log(playerId + " promoteplayer")
    await this.lobbyService.promotePlayer(this.lobby.id, playerId, playerName);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Text copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }
}
