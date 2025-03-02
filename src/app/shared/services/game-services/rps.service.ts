import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class RpsService {
  constructor(
    private firestore: AngularFirestore,
  ) {
    // setLogLevel('debug');
  }



  getGameState(lobbyId: string): Observable<any> {
    return this.firestore.collection('gameplay').doc(lobbyId).valueChanges();
  }

  makeChoice(lobbyId: string, choice: string, userId: string, currentRound: number): boolean {
    try {
      const gameDocRef = this.firestore.collection('gameplay').doc(lobbyId);
      const choicePath = `rounds.${currentRound}.choices.${userId}`;
      const updateData = {
        [choicePath]: {
          choice,
          timestamp: new Date()
        }
      };
      gameDocRef.update(updateData).then();
      return true;
    } catch (error) {
      console.error('Error during choice saving:', error);
      return false;
    }
  }
}
