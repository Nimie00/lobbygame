import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {firstValueFrom, Observable, shareReplay} from 'rxjs';
import {map} from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import {Lobby} from '../models/lobby.model';
import {User} from '../models/user.model';
import DocumentReference = firebase.firestore.DocumentReference;
import {BaseGame} from "../models/games.gameplaydata.model";
import {Game} from "../models/game.model";
import {arrayUnion, arrayRemove, setLogLevel} from '@angular/fire/firestore';


@Injectable({
  providedIn: 'root'
})
export class LobbyService {
  private lobbiesCache$: { [key: string]: Observable<{ userLobby: Lobby | null, otherLobbies: Lobby[] }> } = {};
  private readonly gamesCacheKey = 'gamesCache';


  constructor(private firestore: AngularFirestore,
  ) {
  }


  getLobbies(userId: string, live: boolean): Observable<{ userLobby: Lobby | null, otherLobbies: Lobby[] }> {
    const cacheKey = `${userId}-${live}`;

    if (!this.lobbiesCache$[cacheKey]) {
      this.lobbiesCache$[cacheKey] = this.firestore.collection<Lobby>('lobbies', ref =>
        live
          ? ref.where('status', '!=', 'ended')
          : ref.where('status', '==', 'ended')
      ).snapshotChanges().pipe(
        map(actions => {
          const lobbies = actions.map(a => {
            const data = a.payload.doc.data() as Lobby;
            const id = a.payload.doc.id;
            return {id, ...data};
          });

          const userLobby = lobbies.find(lobby => lobby.ownerId === userId && lobby.status != "ended") || null;
          const otherLobbies = lobbies.filter(lobby => lobby.ownerId !== userId || (lobby.ownerId === userId && lobby.status == "ended"));

          return {
            userLobby,
            otherLobbies
          };
        }),
        shareReplay({
          bufferSize: 1,
          refCount: true
        })
      );
    }

    return this.lobbiesCache$[cacheKey];
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

  async joinLobby(lobbyId: string, user: User): Promise<void> {
    const isBanned = await this.isUserBannedFromLobby(lobbyId, user);

    if (isBanned) {
      return Promise.reject('User is banned from this lobby');
    }

    const batch = this.firestore.firestore.batch();

    const userRef = this.firestore.collection('users').doc(user.id).ref;
    batch.update(userRef, {
      inLobby: lobbyId,
    });


    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      players: arrayUnion(user.id),
      playerNames: arrayUnion(user.username),
    });
    return batch.commit();
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

      for (const playerId of lobbyData.players) {
        userUpdates.push(
          this.firestore.collection('users').doc(playerId).update({
            inLobby: null
          })
        );
      }

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

  leaveLobby(lobbyId: string, user: User): Promise<void> {
    const batch = this.firestore.firestore.batch();
    const userRef = this.firestore.collection('users').doc(user.id).ref;
    batch.update(userRef, {
      inLobby: null,
    });
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      players: arrayRemove(user.id),
      playerNames: arrayRemove(user.username)
    });
    return batch.commit();
  }

  async addSpectator(lobbyId: string, user: User): Promise<void> {
    const isBanned = await this.isUserBannedFromLobby(lobbyId, user);
    if (isBanned) {
      return Promise.reject('User is banned from this lobby');
    }
    const batch = this.firestore.firestore.batch();
    const userRef = this.firestore.collection('users').doc(user.id).ref;
    batch.update(userRef, {
      inLobby: lobbyId,
    });
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      spectators: arrayUnion(user.id),
      spectatorNames: arrayUnion(user.username),
    });
    return batch.commit();
  }

  removeSpectator(lobbyId: string, user: User): Promise<void> {
    const batch = this.firestore.firestore.batch();
    const userRef = this.firestore.collection('users').doc(user.id).ref;
    batch.update(userRef, {
      inLobby: null,
    });
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      spectators: arrayRemove(user.id),
      spectatorNames: arrayRemove(user.username)
    });
    return batch.commit();
  }


  startGame(
    lobby: Lobby
  ): Promise<any> {
    let now = new Date();
    const baseData: BaseGame = {
      status: 'in-progress',
      startedAt: now,
      endedAt: null,
      lobbyId: lobby.id,
      players: lobby.players,
      spectators: lobby.spectators,
      lobbyName: lobby.name,
      gameModifiers: lobby.gameModifiers,
      playerNames: lobby.playerNames,
      spectatorNames: lobby.spectatorNames,
      winner: null,
      maxRounds: lobby.maxRounds,
      bestOfRounds: lobby.maxRounds,
      rounds: {},
      endReason: null,
      currentRound: 0,
      gameEnded:false,
      ownerId: lobby.ownerId,
      gameType: lobby.gameType,
    };

    let gameData: BaseGame
    switch (lobby.gameType) {
      case 'RPS': // Rock-Paper-Scissors
        gameData = baseData; // RPS nem ad hozzá új mezőket
        break;
      default:
        throw new Error(`Unsupported game type: ${lobby.gameType}`);
    }

    const lobbyRef = this.firestore.collection('lobbies').doc(lobby.id); // Lobby referencia
    const gameRef = this.firestore.collection('gameplay').doc(lobby.id); // Gameplay referencia

    return this.firestore.firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(gameRef.ref);

      if (doc.exists) {
        throw new Error('A gameplay dokumentum már létezik ezzel a lobby ID-vel.');
      } else {

        transaction.update(lobbyRef.ref, {status: 'started'});

        transaction.set(gameRef.ref, gameData);
      }
    }).then(() => {
      console.log('Gameplay dokumentum sikeresen létrehozva és a lobby státusza frissítve.');
      return gameRef;
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

  async getLobbySnapshot(lobbyId: string): Promise<Lobby | undefined> {
    try {
      const docSnapshot = await firstValueFrom(
        this.firestore.doc<Lobby>(`lobbies/${lobbyId}`).get()
      );
      return docSnapshot.exists ? (docSnapshot.data() as Lobby) : undefined;
    } catch (error) {
      console.error('Error fetching lobby snapshot:', error);
      return undefined;
    }
  }

  async getGames(): Promise<Game[]> {
    const cachedGames = localStorage.getItem(this.gamesCacheKey);
    if (cachedGames) {
      try {
//        console.log(JSON.stringify(JSON.parse(cachedGames)));
        return JSON.parse(cachedGames) as Game[];
      } catch (error) {
        console.error('Hiba a cache feldolgozása során:', error);
        localStorage.removeItem(this.gamesCacheKey);
      }
    }

    const gamesSnapshot = await firstValueFrom(
      this.firestore.collection('games').get()
    );

    const games = gamesSnapshot.docs.map(doc => {
      const data = doc.data() as Record<string, any>;
      return {id: doc.id, ...data} as Game;
    });

    localStorage.setItem(this.gamesCacheKey, JSON.stringify(games));

    return games;
  }

  async endLobby(lobbyId: string, winner: string, endReason: string): Promise<void> {
    const lobbyRef = this.firestore.doc('lobbies/' + lobbyId);
    const lobbySnap = await firstValueFrom(lobbyRef.get());

    if (!lobbySnap.exists) {
      throw new Error('Lobby not found');
    }

    const lobbyData = lobbySnap.data() as Lobby;
    const players = lobbyData?.players || [];
    const spectators = lobbyData?.spectators || [];

    console.log("Service lobbydata: ", lobbyData);

    const batch = this.firestore.firestore.batch();

    [...players, ...spectators].forEach(userId => {
      const userRef = this.firestore.doc('users/' + userId).ref;
      batch.update(userRef, {inLobby: null});
    });

    const gameplayRef = this.firestore.doc('gameplay/' + lobbyId).ref;
    batch.update(gameplayRef, {status: 'ended', winner: winner, endReason: endReason, endedAt: new Date(), gameEnded: true});
    batch.update(lobbyRef.ref, {status: 'ended'});

    await batch.commit();

    console.log('Lobby ended successfully');
  }

  async updateLobby(lobbyId: string, lobbyData: Partial<Lobby>): Promise<void> {
    return this.firestore.collection('lobbies').doc(lobbyId)
      .update({
        ...lobbyData,
        id: lobbyId  // Megőrizzük az eredeti ID-t
      })
      .then(() => {
        console.log(`Lobby ${lobbyId} successfully updated`);
      })
      .catch(error => {
        console.error('Error updating lobby:', error);
        throw error;
      });
  }

  async isUserBannedFromLobby(lobbyId: string, user: User): Promise<boolean> {
    const lobbyRef = this.firestore.doc('lobbies/' + lobbyId);
    const lobbySnap = await firstValueFrom(lobbyRef.get());

    if (!lobbySnap.exists) {
      throw new Error('Lobby not found');
    }

    const lobbyData = lobbySnap.data() as any;
    const bannedPlayers = lobbyData?.bannedPlayers || [];
    return bannedPlayers.includes(user.id);
  }

  async banPlayer(lobbyId: string, userId: string, userName: string) {
    const batch = this.firestore.firestore.batch();
    const userRef = this.firestore.collection('users').doc(userId).ref;
    batch.update(userRef, {
      inLobby: null,
    });
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      players: arrayRemove(userId),
      playerNames: arrayRemove(userName),
      bannedPlayers: arrayUnion(userId),
      bannedPlayerNames: arrayUnion(userName),
    });
    await batch.commit();

    console.log('Player Banned');
  }

  async unbanPlayer(lobbyId: string, userId: string, userName: string) {
    const batch = this.firestore.firestore.batch();
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      bannedPlayers: arrayRemove(userId),
      bannedPlayerNames: arrayRemove(userName),
    });
    await batch.commit();

    console.log('Player Unbanned');

  }

  async kickUser(lobbyId: string, userId: string, userName: string): Promise<void> {
    const batch = this.firestore.firestore.batch();
    const userRef = this.firestore.collection('users').doc(userId).ref;
    batch.update(userRef, {
      inLobby: null,
    });
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      players: arrayRemove(userId),
      playerNames: arrayRemove(userName),
    });
    await batch.commit();

    console.log('Player Kicked');
  }

  async promotePlayer(lobbyId: string, userId: string, userName: string): Promise<void> {
    const batch = this.firestore.firestore.batch();

    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      ownerId: userId,
      ownerName: userName,
    });
    await batch.commit();

    console.log('Player Promoted');
  }

  async renameUser(id: string, playerId: string, playerName: string) {

  }

  lobbyCooldown(lobbyId: string) {
    this.firestore.collection('lobbies').doc(lobbyId).update({
      status: 'starting'
    });

  }
}
