import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {firstValueFrom, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import {Lobby} from '../models/lobby.model';
import DocumentReference = firebase.firestore.DocumentReference;

@Injectable({
  providedIn: 'root'
})
export class LobbyService {
  constructor(private firestore: AngularFirestore) {
  }

  getLobbies(userId: string): Observable<Lobby[]> {
    return this.firestore.collection<Lobby>('lobbies').snapshotChanges().pipe(
      map(actions => {
        const lobbies = actions.map(a => {
          const data = a.payload.doc.data() as Lobby;
          const id = a.payload.doc.id;

          return {id, ...data};
        }).filter(lobby => lobby.status !== 'ended');

        // Szétválasztjuk a felhasználó lobbyját és a többi lobbyt
        lobbies.find(lobby => console.log(lobby.ownerId));
        console.log("userid: "+ userId);
        const userLobby = lobbies.find(lobby => lobby.ownerId === userId);
        const otherLobbies = lobbies.filter(lobby => lobby.ownerId !== userId);

        // Ha van a felhasználónak lobbyja, azt tesszük az elejére, utána jön a többi
        return userLobby ? [userLobby, ...otherLobbies] : otherLobbies;
      })
    );
  }

  createLobby(lobbyData: Omit<Lobby, 'id'>, userId: string): Promise<DocumentReference<Lobby>> {
    return this.firestore.collection('lobbies').add(lobbyData)
      .then((newLobbyRef: DocumentReference<Lobby>) => {
        return newLobbyRef.update({id: newLobbyRef.id})
          .then(() => {
            return this.firestore.collection('users').doc(userId).update({
              inLobby: newLobbyRef.id
            })
              .then(() => {
                return newLobbyRef;
              });
          });
      });
  }

  joinLobby(lobbyId: string, userId: string): Promise<void> {
    this.firestore.collection('users').doc(userId).update({
      inLobby: lobbyId,
    })
    return this.firestore.collection('lobbies').doc(lobbyId).update({
      players: firebase.firestore.FieldValue.arrayUnion(userId)
    });
  }

  async destroyLobby(lobbyId: string): Promise<void> {
    const lobbySnapshot = await this.firestore.collection('lobbies').doc(lobbyId).get().toPromise();

    if (lobbySnapshot) {
      const lobbyData = lobbySnapshot.data() as Lobby;
      const userUpdates: Promise<void>[] = [];

      // Frissítjük a spectatorok adatait
      for (const spectatorId of lobbyData.spectators) {
        userUpdates.push(
          this.firestore.collection('users').doc(spectatorId).update({
            inLobby: null
          })
        );
      }

      // Frissítjük a playerek adatait
      for (const playerId of lobbyData.players) {
        userUpdates.push(
          this.firestore.collection('users').doc(playerId).update({
            inLobby: null
          })
        );
      }

      // Töröljük a lobby dokumentumot
      userUpdates.push(
        this.firestore.collection('lobbies').doc(lobbyId).delete()
      );

      await Promise.all(userUpdates);
    }
  }

  addBot(lobbyId: string): Promise<void> {
    return this.firestore.collection('lobbies').doc(lobbyId).update({
      hasBots: true // Assuming you have a hasBots field, or update the logic accordingly
    });
  }

  kickUser(lobbyId: string, userId: string): Promise<void> {
    this.firestore.collection('users').doc(userId).update({
      inLobby: null
    })
    return this.firestore.collection('lobbies').doc(lobbyId).update({
      players: firebase.firestore.FieldValue.arrayRemove(userId)
    });
  }

  leaveLobby(lobbyId: string, userId: string): Promise<void> {
    this.firestore.collection('users').doc(userId).update({
      inLobby: null,
    })
    return this.firestore.collection('lobbies').doc(lobbyId).update({
      players: firebase.firestore.FieldValue.arrayRemove(userId)
    });
  }

  addSpectator(lobbyId: string, userId: string): Promise<void> {
    this.firestore.collection('users').doc(userId).update({
      inLobby: lobbyId,
    })
    return this.firestore.collection('lobbies').doc(lobbyId).update({
      spectators: firebase.firestore.FieldValue.arrayUnion(userId)
    });

  }

  removeSpectator(lobbyId: string, userId: string): Promise<void> {
    this.firestore.collection('users').doc(userId).update({
      inLobby: null,
    })
    return this.firestore.collection('lobbies').doc(lobbyId).update({
      spectators: firebase.firestore.FieldValue.arrayRemove(userId)
    });

  }

  startGame(lobbyId: string, players: string[]): Promise<any> {
    const gameplayData = {
      lobbyId: lobbyId,
      players: players,
      choices: {},
      startedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'in-progress'
    };

    console.log(gameplayData);

    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId); // Lobby referencia
    const docRef = this.firestore.collection('gameplay').doc(lobbyId); // Gameplay referencia

    lobbyRef.update({
      status: 'started'
    });

    return this.firestore.firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef.ref);

      if (doc.exists) {
        throw new Error('A gameplay dokumentum már létezik ezzel a lobby ID-vel.');
      } else {

        transaction.update(lobbyRef.ref, {status: 'started'});

        transaction.set(docRef.ref, gameplayData);
      }
    }).then(() => {
      console.log('Gameplay dokumentum sikeresen létrehozva és a lobby státusza frissítve.');
      return docRef;
    }).catch((error) => {
      console.error('Hiba történt a gameplay dokumentum létrehozásakor:', error);
      throw error;
    });
  }

  getLobbyPlayersAndSpectators(lobbyId: string): Observable<any[]> {
    return this.firestore.collection('lobbies').doc(lobbyId).valueChanges().pipe(
      map((lobby: any) => {
        return [...lobby.players, ...lobby.spectators];
      })
    );
  }

  getLobby(lobbyId: string): Observable<Lobby> {
    return this.firestore.doc<Lobby>(`lobbies/${lobbyId}`).valueChanges();
  }

  getGames() {
    return this.firestore.collection('games').valueChanges();
  }

  getUserLobby(userId: string): Observable<Lobby | null> {
    return this.firestore.collection<Lobby>('lobbies', ref => ref.where('ownerId', '==', userId))
      .snapshotChanges()
      .pipe(
        map(actions => {
          if (actions.length === 0) return null;
          const action = actions[0];
          const data = action.payload.doc.data() as Lobby;
          const id = action.payload.doc.id;
          return {id, ...data};
        })
      );
  }

  async endLobby(lobbyId: string): Promise<void> {
    const lobbyRef = this.firestore.doc('lobbies/' + lobbyId);
    const lobbySnap = await firstValueFrom(lobbyRef.get());

    if (!lobbySnap.exists) {
      throw new Error('Lobby not found');
    }

    const lobbyData = lobbySnap.data() as any;
    const players = lobbyData?.players || [];
    const spectators = lobbyData?.spectators || [];

    const batch = this.firestore.firestore.batch();

    // Update all players and spectators
    [...players, ...spectators].forEach(userId => {
      const userRef = this.firestore.doc('users/' + userId).ref;
      batch.update(userRef, { inLobby: null });
    });

    // Update lobby and gameplay status
    const gameplayRef = this.firestore.doc('gameplay/' + lobbyId).ref;
    batch.update(gameplayRef, { status: 'ended' });
    batch.update(lobbyRef.ref, { status: 'ended' });

    // Commit the batch
    await batch.commit();

    console.log('Lobby ended successfully');
  }
}
