import {Component, Input, ViewChild} from '@angular/core';
import { IonModal } from '@ionic/angular';
import {LobbyService} from "../../services/lobby.service";
import {User} from "../../models/user.model";
import {Lobby} from "../../models/lobby.model";
import {Router} from "@angular/router";

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
  @ViewChild('lobbyPlayersModal') modal!: IonModal;
  @Input() lobby: Lobby;
  @Input() currentUser: User = null;
  players: string[]=[];
  playerNames: string[]=[];
  bannedPlayers: string[]=[];
  bannedPlayerNames: string[]=[];
  routertext: string = "";

  constructor(private lobbyService: LobbyService,
              private router: Router  ) {
  }

  ngOnInit() {
    if (this.lobby) {
      this.initializePlayers();
      // this.routertext = this.router.url;
    }
  }


  private initializePlayers() {
    this.players = this.lobby.players || [];
    this.bannedPlayers = this.lobby.bannedPlayers || [];
    this.playerNames = this.lobby.playerNames || [];
    this.bannedPlayerNames = this.lobby.bannedPlayerNames || [];
  }

  close() {
    this.modal.dismiss();
  }

  open() {
    if (this.lobby) {
      this.initializePlayers(); // Frissítjük az adatokat amikor megnyitjuk a modalt
    }
    this.modal.present();
  }

  // Player management methods

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
}
