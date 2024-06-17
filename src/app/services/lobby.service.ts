import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';

@Injectable({
  providedIn: 'root' // Győződj meg róla, hogy ez itt van
})
export class LobbyService {
  constructor(private firestore: AngularFirestore) {console.log("Lobbyservice")}


  getLobbies(): Observable<any[]> {
    return this.firestore.collection('lobbies').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data();
        return { data };
      }))
    );
  }

  createLobby(lobbyData: any): Promise<any> {
    return this.firestore.collection('lobbies').add(lobbyData);
  }

  joinLobby(lobbyId: string, userId: string): Promise<void> {
    return this.firestore.collection('lobbies').doc(lobbyId).update({
      players: firebase.firestore.FieldValue.arrayUnion(userId)
    });
  }
}
