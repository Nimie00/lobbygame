import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {AuthService} from "../auth.service";
import {Router} from "@angular/router";
import {SubscriptionTrackerService} from "../subscriptionTracker.service";
import {LobbyService} from "../lobby.service";

@Injectable({
  providedIn: 'root'
})
export class GameStartService {
  private CATEGORY = "gameStart"

  constructor(
    private firestore: AngularFirestore,
    private router: Router,
    private subscriptionTracker: SubscriptionTrackerService
  ) {
  }

  // Játékosok számára: Lobby figyelése
  watchLobbyAsPlayer(lobbyId: string) {
    const subscription = this.firestore
      .collection('lobbies')
      .doc(lobbyId)
      .valueChanges()
      .subscribe((lobbyData: any) => {
        if (lobbyData?.status === 'starting') {
          this.handleCountdown(() => {
            this.stopWatchingLobby(lobbyId);
          }, lobbyId);
        }
      });

    this.subscriptionTracker.add('lobbyWatch', lobbyId, subscription);
  }

  // Feliratkozás törlése
  stopWatchingLobby(lobbyId: string) {
    this.subscriptionTracker.unsubscribeCategory('lobbyWatch');
  }

  handleCountdown(onComplete: () => void, lobbyId: string): Promise<void> {
    return new Promise((resolve) => {
      let countdown = 3;

      const countdownInterval = setInterval(() => {
        if (countdown > 0) {
          this.showCountdownMessage(`A játék hamarosan kezdődik... ${countdown}`);
          countdown--;
        } else {
          clearInterval(countdownInterval);
          onComplete();
          resolve();
          this.jumpToGame(lobbyId);
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

  jumpToGame(lobbyId: string) {
    this.router.navigate(['/game/' + lobbyId]);
  }
}
