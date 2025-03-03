import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {Observable} from "rxjs";
import {BaseGame} from "../../models/games.gameplaydata.model";

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

  async makeChoice(lobbyId: string, choice: string, userId: string, currentRound: number): Promise<boolean> {
    const gameDoc = this.firestore.collection('gameplay').doc(lobbyId);
    const gameDocRef = gameDoc.ref;
    const choicePath = `rounds.${currentRound}.choices.${userId}`;
    const newTimestamp = Date.now();

    return this.firestore.firestore.runTransaction(async transaction => {
      const gameDocSnapshot = await transaction.get(gameDocRef);
      if (!gameDocSnapshot.exists) {
        throw new Error('Game document does not exist.');
      }

      const gameData = gameDocSnapshot.data() as BaseGame;

      let finalTimestamp = newTimestamp;
      if (currentRound > 0) {

        const roundData = gameData?.rounds?.[currentRound - 1];
        let lastTimestamp :any= 0;
        if (roundData && roundData.choices) {
          Object.values(roundData.choices).forEach((data: any) => {
            if (data.timestamp.toMillis() > lastTimestamp) {
              lastTimestamp = data.timestamp.toMillis();
            }
          });
        }
        finalTimestamp = newTimestamp > lastTimestamp ? newTimestamp : lastTimestamp + 312;
      }

      const updateData = {
        [choicePath]: {
          choice,
          timestamp: new Date(finalTimestamp),
        }
      };

      transaction.update(gameDocRef, updateData);
      return true;
    })
      .then(() => true)
      .catch(error => {
        console.error('Error during choice saving:', error);
        return false;
      });
  }

}
