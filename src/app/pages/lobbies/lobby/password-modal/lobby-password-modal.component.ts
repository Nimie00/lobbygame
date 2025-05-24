import {AfterViewInit, Component, EventEmitter, Input, OnDestroy, Output, ViewChild} from "@angular/core";
import {IonModal} from "@ionic/angular";
import {User} from "../../../../shared/models/user";
import {Lobby} from "../../../../shared/models/lobby.model";
import {LanguageService} from "../../../../shared/services/language.service";
import {ModalService} from "../../../../shared/services/modal.service";
import {SubscriptionTrackerService} from "../../../../shared/services/subscriptionTracker.service";
import {LobbyService} from "../../../../shared/services/lobby.service";
import {AlertService} from "../../../../shared/services/alert.service";
import * as bcrypt from 'bcryptjs';

@Component({
  selector: 'app-lobby-password-modal',
  templateUrl: './lobby-password-modal.component.html',
  styleUrls: ['./lobby-password-modal.component.scss'],
})
export class LobbyPasswordModalComponent implements AfterViewInit, OnDestroy {
  private CATEGORY = "lobby-password-modal"
  @ViewChild('lobbyPasswordModal', {static: false}) modal: IonModal;
  @Output() closeModal = new EventEmitter<void>();
  @Input() lobby: Lobby;
  @Input() currentUser: User;
  protected password: string;


  constructor(
    private tracker: SubscriptionTrackerService,
    private languageService: LanguageService,
    private modalService: ModalService,
    private lobbyService: LobbyService,
    private alertService: AlertService,
  ) {

  }

  async ngAfterViewInit() {
    if (this.modal) {
      await this.modal.present();
    }
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  private async isPasswordCorrect(password: string): Promise<boolean> {
    if (!bcrypt.compareSync(password, this.getLobbyPassword())) {
      await this.alertService.showAlert(
        `${this.languageService.translate("PASSWORD")}`,
        `${this.languageService.translate("WRONG_PASSWORD")}.`);
      return false;
    }

    return true;
  }

  private getLobbyPassword(): string {
    return this.lobby.password;
  }

  isUserInLobby(): boolean {
    return this.lobby.players.includes(this.currentUser.id);
  }

  isUserSpectatingLobby(): boolean {
    return this.lobby.spectators.includes(this.currentUser.id);
  }

  async joinWithPassword() {
    if (await this.isPasswordCorrect(this.password) && !this.isUserInLobby() && !this.isUserSpectatingLobby() && (this.lobby.status !== 'started' && this.lobby.status !== 'starting')) {
      this.joinLobby(this.lobby.id)
      await this.close();
    } else {
      console.error('Incorrect password');
    }
  }

  async joinWithPasswordAsSpectator() {
    if (await this.isPasswordCorrect(this.password) && !this.isUserInLobby() && !this.isUserSpectatingLobby() && this.lobby.allowSpectators === true && !this.currentUser.inLobby) {
      this.joinAsSpectator(this.lobby.id, false);
      await this.close();
    } else {
      console.error('Incorrect password');
    }
  }

  async close() {
    if (this.modal) {
      this.modalService.closeModal()
      this.closeModal.emit();
      await this.modal.dismiss();
    }
  }

  //lobby-ban  is benne van, csúnya, de bonyolult lenne összekötni
  joinLobby(lobbyId: string) {
    this.lobbyService.joinLobby(lobbyId, this.currentUser).then(() => {
    });
  }

  //lobby-ban is benne van, csúnya, de bonyolult lenne összekötni
  joinAsSpectator(lobbyId: string, started: boolean) {
    if (this.lobby.allowSpectators) {
      this.lobbyService.addSpectator(lobbyId, this.currentUser, started).then(() => {
      });
    }
  }
}
