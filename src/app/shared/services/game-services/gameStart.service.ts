import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {Router} from "@angular/router";
import {SubscriptionTrackerService} from "../subscriptionTracker.service";
import {Lobby} from "../../models/lobby.model";
import {LanguageService} from "../language.service";

@Injectable({
  providedIn: 'root'
})
export class GameStartService {
  private CATEGORY = "gameStart";

  constructor(
    private firestore: AngularFirestore,
    private router: Router,
    private subscriptionTracker: SubscriptionTrackerService,
    private translateService: LanguageService,
  ) {
  }


  // Játékosok számára: Lobby figyelése
  watchLobbyAsPlayer(lobbyId: string, userId: string) {
    const subscription = this.firestore
      .collection('lobbies')
      .doc(lobbyId)
      .valueChanges()
      .subscribe((lobbyData: any) => {
        if (lobbyData?.status === 'starting') {

          this.handleCountdown(() => {
            this.stopWatchingLobby(lobbyId);
          }, lobbyId, lobbyData?.spectators.includes(userId));
        }
      });

    this.subscriptionTracker.add(this.CATEGORY, "lobbyWatch", subscription);
  }

  // Feliratkozás törlése
  stopWatchingLobby(lobbyId: string) {
    this.subscriptionTracker.unsubscribeCategory(this.CATEGORY);
  }

  handleCountdown(onComplete: () => void, lobbyId: string, isSpectator: boolean): Promise<void> {
    return new Promise((resolve) => {
      let countdown = 3;

      const countdownInterval = setInterval(() => {
        if (countdown > 0) {

          this.showCountdownMessage(`${this.translateService.translate("GAME_STARTING_SOON")} ${countdown}`);
          countdown--;
        } else {
          clearInterval(countdownInterval);
          onComplete();
          resolve();
          if(isSpectator != null && isSpectator){
            this.openSpectatorWindow(lobbyId);
          } else {
            this.openGameWindow(lobbyId);
          }
        }
      }, 1000);
    });

  }

  private showCountdownMessage(message: string) {
    const countdownElement = document.createElement('div');
    countdownElement.innerText = message;
    countdownElement.style.position = 'fixed';
    countdownElement.style.top = '50%';
    countdownElement.style.left = '50%';
    countdownElement.style.transform = 'translate(-50%, -50%)';
    countdownElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    countdownElement.style.color = 'white';
    countdownElement.style.padding = '20px';
    countdownElement.style.zIndex = '1000';
    countdownElement.style.borderRadius = '10px';
    countdownElement.style.fontSize = '24px';
    document.body.appendChild(countdownElement);

    setTimeout(() => {
      document.body.removeChild(countdownElement);
    }, 1000);
  }

  openGameWindow(lobbyId: string) {
      this.router.navigate(['/game/' + lobbyId]);
  }

  openSpectatorWindow(lobbyId: string){
    this.router.navigate(['/spectate/' + lobbyId]);
  }

  openSpectatorReplayWindow(lobbyId: string){
    this.router.navigate(['/spectate/' + lobbyId + '/replay']);
  }

}
