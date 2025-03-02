import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {Router} from "@angular/router";
import {SubscriptionTrackerService} from "../subscriptionTracker.service";
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
    private languageService: LanguageService,
  ) {
  }

  stopWatchingLobby() {
    this.subscriptionTracker.unsubscribeCategory(this.CATEGORY);
  }

  handleCountdown(onComplete: () => void, lobbyId: string, isPlayer: boolean): Promise<void> {
    return new Promise((resolve) => {
      let countdown = 3;
      const countdownInterval = setInterval(() => {
        if (countdown > 0) {
          this.showCountdownMessage(`${this.languageService.translate("GAME_STARTING_SOON")} ${countdown}`);
          countdown--;
        } else {
          clearInterval(countdownInterval);
          onComplete();
          resolve();
          isPlayer ? this.openGameWindow(lobbyId): this.openSpectatorWindow(lobbyId);
        }
      }, 1000);
    });

  }

  private showCountdownMessage(message: string) {
    // Létrehozunk egy teljes képernyős overlay elemet
    const overlayElement = document.createElement('div');
    overlayElement.style.position = 'fixed';
    overlayElement.style.top = '0';
    overlayElement.style.left = '0';
    overlayElement.style.width = '100%';
    overlayElement.style.height = '100%';
    overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Szötétebb, de áttetsző overlay
    overlayElement.style.zIndex = '999'; // Az overlay a háttérben, de minden elem fölött van
    document.body.appendChild(overlayElement);

    // Létrehozunk egy countdown üzenet elemet
    const countdownElement = document.createElement('div');
    countdownElement.innerText = message;
    countdownElement.style.position = 'fixed';
    countdownElement.style.top = '50%';
    countdownElement.style.left = '50%';
    countdownElement.style.transform = 'translate(-50%, -50%)';
    countdownElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    countdownElement.style.color = 'white';
    countdownElement.style.padding = '20px';
    countdownElement.style.zIndex = '1000'; // Az üzenet az overlay fölött legyen
    countdownElement.style.borderRadius = '10px';
    countdownElement.style.fontSize = '24px';
    document.body.appendChild(countdownElement);

    // 1 másodperc elteltével eltávolítjuk az overlay-t és az üzenetet is
    setTimeout(() => {
      document.body.removeChild(countdownElement);
      document.body.removeChild(overlayElement);
    }, 1000);
  }

  openGameWindow(lobbyId: string) {
    this.router.navigate(['/game/' + lobbyId]).then(() => {
    });
  }

  openSpectatorWindow(lobbyId: string) {
    this.router.navigate(['/spectate/' + lobbyId]).then(() => {
    });
  }

  openSpectatorReplayWindow(lobbyId: string) {
    this.router.navigate(['/spectate/' + lobbyId + '/replay']).then(() => {
    });
  }

}
