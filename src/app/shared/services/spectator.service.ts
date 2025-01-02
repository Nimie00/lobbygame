import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SpectatorSerice {
  constructor(
    private firestore: AngularFirestore,
  ) {
  }

  getGameState(lobbyId: string): Observable<any> {
    return this.firestore.collection('gameplay').doc(lobbyId).valueChanges();
  }

}
