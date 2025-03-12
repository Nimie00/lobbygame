import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {IonModal} from '@ionic/angular';
import {LobbyService} from "../../../shared/services/lobby.service";
import {User} from "../../../shared/models/user.model";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {distinctUntilChanged, Subscription} from "rxjs";
import {LanguageService} from "../../../shared/services/language.service";
import {ModalService} from "../../../shared/services/modal.service";

@Component({
  selector: 'app-lobby-players-managing-modal',
  templateUrl: './lobby-players-managing-modal.component.html',
  styleUrls: ['./lobby-players-managing-modal.component.scss'],
})
export class LobbyPlayersManagingModalComponent implements OnInit, OnDestroy {
  private CATEGORY = "lobby-player-managing-modal"
  @ViewChild('lobbyPlayersModal') modal: IonModal;
  @Input() currentUser: User = null;
  @Input() lobbyId: string;
  @Output() closeModal = new EventEmitter<void>();
  @Input() isModalOpen: boolean;
  routerText: string = "";
  private lobbySubscription: Subscription;
  lobbyData: any;
  spoilerRevealed = false;
  protected debug: boolean;


  constructor(private lobbyService: LobbyService,
              private tracker: SubscriptionTrackerService,
              private languageService: LanguageService,
              private modalService: ModalService,
  ) {
  }


  async ngOnInit() {
    this.debug = localStorage.getItem('debug') === 'true';
    this.initializeRouterText();
    await this.subscribeLobbyChanges();
  }


  private async subscribeLobbyChanges() {
    this.lobbySubscription = this.lobbyService.getLobby(this.lobbyId)
      .pipe(
        distinctUntilChanged()
      ).subscribe({
        next: (data) => {
          this.lobbyData = data;
        },
        error: (error) => console.error('Error in lobby subscription:', error),
      });
    this.tracker.add(this.CATEGORY, "getGameAndUserSub", this.lobbySubscription);
  }

  private initializeRouterText() {
    this.routerText = window.location.pathname + '/';
    if (this.routerText.includes(this.lobbyId)) {
      this.routerText = this.routerText.split(this.lobbyId)[0];
    }
    this.routerText = window.location.host + this.routerText;
  }


  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }


  async close() {
    this.modalService.closeModal()
    this.closeModal.emit();
    this.isModalOpen = false;
    await this.modal.dismiss();
  }


  renamePlayer(playerId: string) {
    if (playerId.includes('#')) {//Az AI játékosoknak van # az id-ben ezért őket ne tudjuk befolyásolni
      return;
    }
    this.lobbyService.renameUser(this.lobbyData.id, playerId);
  }

  kickPlayer(playerId: string, playerName: string) {
    if(playerId.includes('#')){//Az AI játékosoknak van # az id-ben ezért őket ne tudjuk befolyásolni
      return;
    }
    this.lobbyService.kickUser(this.lobbyData.id, playerId, playerName);
  }

  banPlayer(playerId: string, playerName: string) {
    if (playerId.includes('#')) { //Az AI játékosoknak van # az id-ben ezért őket ne tudjuk befolyásolni
      return;
    }
    this.lobbyService.banPlayer(this.lobbyData.id, playerId, playerName);
  }

  unbanPlayer(playerId: string, playerName: string) {
    if (playerId.includes('#')) { //Az AI játékosoknak van # az id-ben ezért őket ne tudjuk befolyásolni
      return;
    }
    this.lobbyService.unbanPlayer(this.lobbyData.id, playerId, playerName);
  }

  promotePlayer(playerId: string, playerName: string) {
    if (playerId.includes('#')) { //Az AI játékosoknak van # az id-ben ezért őket ne tudjuk befolyásolni
      return;
    }
    this.lobbyService.promotePlayer(this.lobbyData.id, playerId, playerName);
    this.close();
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Text copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }

  addBot() {
    this.lobbyService.addBot(this.lobbyData.id).then();
  }

  kickAI(AIId: string, AIName: string) {
    if(!AIId.includes('#')){// Gátoljuk, hogy NEM AI játékosokat ki tudjunk kickelni
      return;
    }
    this.lobbyService.kickAI(this.lobbyData.id, AIId, AIName).then();
  }
}
