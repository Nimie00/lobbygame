import {ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {IonModal} from '@ionic/angular';
import {LobbyService} from "../../../shared/services/lobby.service";
import {User} from "../../../shared/models/user.model";
import {Router} from "@angular/router";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {distinctUntilChanged, Subscription} from "rxjs";
import {LanguageService} from "../../../shared/services/language.service";
import {ModalService} from "../../../shared/services/modal-services/modal.service";

@Component({
  selector: 'app-lobby-players-managing',
  templateUrl: './lobby-players-managing.component.html',
  styleUrls: ['./lobby-players-managing.component.scss'],
})
export class LobbyPlayersManagingComponent implements OnInit, OnDestroy {
  private CATEGORY = "lobby-player-managing-modal"
  @ViewChild('lobbyPlayersModal') modal: IonModal;
  @Input() currentUser: User = null; // Bejövő adat az aktuális felhasználóról
  @Input() lobbyId: string; // Az aktuális lobby azonosítója
  @Output() closeModal = new EventEmitter<void>(); // Bezárás eseményének értesítése
  @Input() isModalOpen: boolean;
  routerText: string = "";
  private lobbySubscription: Subscription;
  lobbyData: any;


  constructor(private lobbyService: LobbyService,
              private router: Router,
              private tracker: SubscriptionTrackerService,
              private cdr: ChangeDetectorRef,
              private translateService: LanguageService,
              private modalService: ModalService,
  ) {
  }


  ngOnInit() {
    this.initializeRouterText();
    this.subscribeLobbyChanges();
  }


  private subscribeLobbyChanges() {
    console.log('Subscribing to lobby changes...');
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


  renamePlayer(playerId: string, playerName: string) {
    this.lobbyService.renameUser(this.lobbyData.id, playerId, playerName);
  }

  kickPlayer(playerId: string, playerName: string) {
    this.lobbyService.kickUser(this.lobbyData.id, playerId, playerName);
  }

  banPlayer(playerId: string, playerName: string) {
    this.lobbyService.banPlayer(this.lobbyData.id, playerId, playerName);
  }

  unbanPlayer(playerId: string, playerName: string) {
    this.lobbyService.unbanPlayer(this.lobbyData.id, playerId, playerName);
  }

  promotePlayer(playerId: string, playerName: string) {
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
}
