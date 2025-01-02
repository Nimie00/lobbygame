import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {IonModal} from '@ionic/angular';
import {LobbyService} from "../../../shared/services/lobby.service";
import {User} from "../../../shared/models/user.model";
import {Lobby} from "../../../shared/models/lobby.model";
import {Router} from "@angular/router";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {Observable} from "rxjs";

@Component({
  selector: 'app-lobby-players-managing',
  templateUrl: './lobby-players-managing.component.html',
  styleUrls: ['./lobby-players-managing.component.scss']
})
export class LobbyPlayersManagingComponent implements OnInit, OnDestroy {
  private CATEGORY = "lobby-player-managing-modal"
  @ViewChild('lobbyPlayersModal') modal!: IonModal;
  @Input() currentUser: User = null;
  @Input() lobbyId: string;
  @Output() closeModal = new EventEmitter<void>();
  lobby: Lobby;
  routertext: string = "";
  protected lobbyObservable: Observable<Lobby>;


  constructor(private lobbyService: LobbyService,
              private router: Router,
              private tracker: SubscriptionTrackerService,
  ) {
  }
  ngOnInit() {
    this.routertext = window.location.pathname + '/';
    if (this.routertext.includes(this.lobbyId)) {
      this.routertext = this.routertext.split(this.lobbyId)[0];
    }
    this.routertext = window.location.host + this.routertext;

    // Lobby adatokat figyelő Observable
    this.lobbyObservable = this.lobbyService.getLobby(this.lobbyId);

    // Manuálisan a trackerhez adva az előfizetés
    const lobbysub = this.lobbyObservable.subscribe((lobby) => {
      if (lobby) {
        this.lobby = lobby;
      }
    });
    this.tracker.add(this.CATEGORY, "lobbySub", lobbysub);
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  async close() {
    console.log("Bezárás")
    await this.modal.dismiss();
  }

  async open() {
    await this.modal.present();
  }

  async renamePlayer(playerId: string, playerName: string) {
    console.log(playerId + " renameplayer")
    await this.lobbyService.renameUser(this.lobby.id, playerId, playerName);
    // await this.close();
  }

  async kickPlayer(playerId: string, playerName: string) {
    console.log(playerId + " kickplayer")
    await this.lobbyService.kickUser(this.lobby.id, playerId, playerName);
    // await this.close();
  }

  async banPlayer(playerId: string, playerName: string) {
    console.log(playerId + " banplayer")
    await this.lobbyService.banPlayer(this.lobby.id, playerId, playerName);
    // await this.close();
  }

  async unbanPlayer(playerId: string, playerName: string) {
    console.log(playerId + " unbanplayer")
    await this.lobbyService.unbanPlayer(this.lobby.id, playerId, playerName);
    // await this.close();
  }

  async promotePlayer(playerId: string, playerName: string) {
    console.log(playerId + " promoteplayer")
    await this.lobbyService.promotePlayer(this.lobby.id, playerId, playerName);
    // await this.close();
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Text copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }
}
