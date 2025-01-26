import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {firstValueFrom, Observable} from "rxjs";
import {setLogLevel} from "@angular/fire/firestore";

@Injectable({
  providedIn: 'root'
})
export class SpectatorSerice {
  constructor(
    private firestore: AngularFirestore,
  ) {
  }



  getGameStateObservable(lobbyId: string): Observable<any> {
    return this.firestore.collection('gameplay').doc(lobbyId).valueChanges();
  }

  getGameStateSnapshot(lobbyId: string): Promise<any> {
    return firstValueFrom(
      this.firestore.collection('gameplay').doc(lobbyId).get()
    ).then(snapshot => {
      if (snapshot.exists) {
        return snapshot.data();
      } else {
        throw new Error('Document does not exist');
      }
    });
  }

}
