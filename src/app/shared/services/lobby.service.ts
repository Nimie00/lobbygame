import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {firstValueFrom, Observable, shareReplay} from 'rxjs';
import {map} from 'rxjs/operators';
import {Lobby} from '../models/lobby.model';
import {User} from '../models/user.model';
import {RPSGame} from "../models/games/games.rps.gameplaydata.model";
import {Game} from "../models/game.model";
import {arrayUnion, arrayRemove, writeBatch, collection, doc} from '@angular/fire/firestore';
import {AlertService} from "./alert.service";
import {LanguageService} from "./language.service";
import {CardService} from "./game-services/card.service";


@Injectable({ providedIn: 'root' })
export class LobbyService {
  private lobbiesCache$: { [key: string]: Observable<{ userLobby: Lobby | null, otherLobbies: Lobby[] }> } = {};
  private readonly gamesCacheKey = 'gamesCache';

  constructor(
    private firestore: AngularFirestore,
    private alertService: AlertService,
    private cardService: CardService,
    private languageService: LanguageService){}


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

  async createLobby(lobbyData: Omit<Lobby, 'id'>, userId: string) {
    const db = this.firestore.firestore;
    const batch = writeBatch(db);
    const newLobbyRef = doc(collection(db, 'lobbies'));
    batch.set(newLobbyRef, {...lobbyData, id: newLobbyRef.id});
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {inLobby: newLobbyRef.id});
    await batch.commit();

    return newLobbyRef;
  }

  async addSpectator(lobbyId: string, user: User, started: boolean): Promise<void> {
    const isBanned = await this.isUserBannedFromLobby(lobbyId, user);
    const allowsSpectators = await this.allowsSpectators(lobbyId);
    if (isBanned) {
      await this.alertService.showAlert(
        `${this.languageService.translate("ERROR")}`,
        `${this.languageService.translate("YOU_ARE_BANNED_FROM_LOBBY")}.`
      );
      return;
    }
    if (!allowsSpectators) {
      await this.alertService.showAlert(
        `${this.languageService.translate("ERROR")}`,
        `${this.languageService.translate("SPECTATORS_NOT_ALLOWED")}.`
      );
      return;
    }

    const batch = this.firestore.firestore.batch();

    const userRef = this.firestore.collection('users').doc(user.id).ref;
    batch.update(userRef, {
      inLobby: lobbyId,
      inSpectate: started ? lobbyId : null,
    });
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      spectators: arrayUnion(user.id),
      spectatorNames: arrayUnion(user.username),
    });

    if (started) {
      const gameRef = this.firestore.collection('gameplay').doc(lobbyId).ref;
      return gameRef.get().then(docSnapshot => {
        if (docSnapshot.exists) {
          batch.update(gameRef, {
            spectators: arrayRemove(user.id),
            spectatorNames: arrayRemove(user.username)
          });
        }
        return batch.commit();
      });
    } else {
      return batch.commit();
    }
  }

  async joinLobby(lobbyId: string, user: User): Promise<void> {
    const isBanned = await this.isUserBannedFromLobby(lobbyId, user);

    if (isBanned) {
      await this.alertService.showAlert(
        `${this.languageService.translate("ERROR")}`,
        `${this.languageService.translate("YOU_ARE_BANNED_FROM_LOBBY")}.`
      );
      return;
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
    return await batch.commit();
  }

  async destroyLobby(lobbyId: string): Promise<void> {
    const lobbyDoc = this.firestore.collection('lobbies').doc(lobbyId);
    const lobbySnapshot = await firstValueFrom(lobbyDoc.get());

    if (lobbySnapshot.exists) {
      const lobbyData = lobbySnapshot.data() as Lobby;

      const batch = this.firestore.firestore.batch();

      const allUserIds = [...lobbyData.spectators, ...lobbyData.players];
      for (const userId of allUserIds) {
        if (!userId.includes('#')) {
          const userRef = this.firestore.collection('users').doc(userId).ref;
          batch.update(userRef, {
            inLobby: null,
            inSpectate: null,
            inGame: null,
            playingGame: null,
          });
        }
      }

      batch.delete(lobbyDoc.ref);
      batch.delete(this.firestore.collection('gameplay').doc(lobbyId).ref);

      return await batch.commit();
    }
  }

  async addBot(lobbyId: string): Promise<void> {
    const MAX_BOTS_IN_LOBBY = 8;
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;

    return this.firestore.firestore.runTransaction(async transaction => {
      const lobbyDoc = await transaction.get(lobbyRef);
      if (!lobbyDoc.exists) {
        throw new Error('Lobby does not exist');
      }

      const lobbyData = lobbyDoc.data() as Lobby;
      const players: string[] = lobbyData.players || [];
      const playerNames: string[] = lobbyData.playerNames || [];


      const usedBotNumbers: number[] = [];
      for (let i = 0; i < players.length; i++) {
        const id = players[i];
        if (id.charAt(0) === '#' && id.length >= 5) {
          if (id.substring(0, 4) === "#bot") {
            const numPart = id.substring(4);
            const num = parseInt(numPart, 10);
            if (!isNaN(num)) {
              usedBotNumbers.push(num);
            }
          }
        }
      }

      let newBotNumber: number | null = null;
      for (let i = 1; i <= MAX_BOTS_IN_LOBBY; i++) {
        if (usedBotNumbers.indexOf(i) === -1) {
          newBotNumber = i;
          break;
        }
      }
      if (newBotNumber === null) {
        newBotNumber = Math.max(...usedBotNumbers) + 1;
      }

      const newBotId = `#bot${newBotNumber}`;
      const newBotName = newBotId;

      const newPlayers = [...players, newBotId];
      const newPlayerNames = [...playerNames, newBotName];

      transaction.update(lobbyRef, {
        hasBots: true,
        players: newPlayers,
        playerNames: newPlayerNames
      });
    });
  }

  async leaveLobby(lobbyId: string, user: User): Promise<void> {
    if (user.id.includes('#')) {
      return;
    }
    const userRef = this.firestore.collection('users').doc(user.id).ref;
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;

    return this.firestore.firestore.runTransaction(async transaction => {
      const lobbyDoc = await transaction.get(lobbyRef);

      if (!lobbyDoc.exists) {
        throw new Error('Lobby does not exist');
      }
      const lobbyData = lobbyDoc.data() as Lobby;
      const players: string[] = lobbyData.players || [];
      const playerNames: string[] = lobbyData.playerNames || [];

      const index = players.indexOf(user.id);
      if (index === -1) {
        throw new Error('User not found in players array');
      }

      const newPlayers = [...players];
      newPlayers.splice(index, 1);

      const newPlayerNames = [...playerNames];
      if (index < newPlayerNames.length) {
        newPlayerNames.splice(index, 1);
      }

      transaction.update(userRef, {
        inLobby: null,
        inSpectate: null,
        inGame: null,
        playingGame: null,
      });
      transaction.update(lobbyRef, {
        players: newPlayers,
        playerNames: newPlayerNames
      });
    });
  }

  async removeSpectator(lobbyId: string, user: User): Promise<void> {
    if (user.id.includes('#')) {
      return;
    }
    const batch = this.firestore.firestore.batch();
    const userRef = this.firestore.collection('users').doc(user.id).ref;
    batch.update(userRef, {
      inLobby: null,
      inSpectate: null,
      inGame: null,
      playingGame: null,
    });
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      spectators: arrayRemove(user.id),
      spectatorNames: arrayRemove(user.username)
    });

    const gameRef = this.firestore.collection('gameplay').doc(lobbyId).ref;
    return gameRef.get().then(docSnapshot => {
      if (docSnapshot.exists) {
        batch.update(gameRef, {
          spectators: arrayRemove(user.id),
          spectatorNames: arrayRemove(user.username)
        });
      }
      return batch.commit();
    });
  }

  async startGame(lobby: Lobby): Promise<any> {
    const now = new Date();
    const baseData: RPSGame = {
      status: 'in-progress',
      startedAt: now,
      endedAt: null,
      lobbyId: lobby.id,
      players: lobby.players,
      spectators: lobby.spectators,
      lobbyName: lobby.name,
      gameModifiers: lobby.gameModifiers || {},
      playerNames: lobby.playerNames,
      spectatorNames: lobby.spectatorNames,
      winner: null,
      hasBots: lobby.hasBots,
      maxRounds: lobby.maxRounds,
      bestOfRounds: lobby.maxRounds,
      rounds: {},
      endReason: null,
      currentRound: 0,
      gameEnded: false,
      ownerId: lobby.ownerId,
      gameType: lobby.gameType,
    };


    let gameData: {};
    switch (lobby.gameType) {
      case 'RPS':
        gameData = baseData;
        break;
      case 'CARD':
        gameData = this.cardService.createCARDGame(lobby, baseData);
        break;
      default:
        await this.alertService.showAlert(
          `${this.languageService.translate("ERROR")}`,
          `${this.languageService.translate("GAMETYPE_NOT_IMPLEMENTED")}`);
        return;
    }

    const lobbyRef = this.firestore.collection('lobbies').doc(lobby.id);
    const gameRef = this.firestore.collection('gameplay').doc(lobby.id);

    try {
      await this.firestore.firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(gameRef.ref);
        if (doc.exists) {
          throw new Error('A gameplay dokumentum már létezik ezzel a lobby ID-vel.');
        }

        transaction.set(gameRef.ref, gameData);
        transaction.update(lobbyRef.ref, {status: 'started'});

        for (const [userId, field] of [
          ...lobby.players.map(id => [id, 'inGame']),
          ...lobby.spectators.map(id => [id, 'inSpectate'])
        ]) {
          if (!userId.includes('#')) {
            const userRef = this.firestore.doc(`users/${userId}`);
            transaction.update(userRef.ref, {
              [field]: lobby.id,
              playingGame: lobby.gameType
            });
          }
        }
      });

      return gameRef;
    } catch (error) {
      console.error('Hiba történt a gameplay dokumentum létrehozásakor:', error);
      throw error;
    }
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

  async getGameTypes(): Promise<Game[]> {
    const cachedData = localStorage.getItem(this.gamesCacheKey);
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData) as { timestamp: number; games: Game[] };
        const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
        const currentTime = Date.now();

        if ((currentTime - parsedData.timestamp) < oneDayInMilliseconds) {
          return parsedData.games;
        } else {
          localStorage.removeItem(this.gamesCacheKey);
        }
      } catch (error) {
        localStorage.removeItem(this.gamesCacheKey);
      }
    }

    const gamesSnapshot = await firstValueFrom(
      this.firestore.collection('games').get()
    );

    const games = gamesSnapshot.docs.map(doc => {
      const data = doc.data() as Record<string, any>;
      return { id: doc.id, ...data } as Game;
    });

    const dataToCache = {
      timestamp: Date.now(),
      games: games
    };
    localStorage.setItem(this.gamesCacheKey, JSON.stringify(dataToCache));

    return games;
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

  async allowsSpectators(lobbyId: string): Promise<boolean> {
    const lobbyRef = this.firestore.doc('lobbies/' + lobbyId);
    const lobbySnap = await firstValueFrom(lobbyRef.get());

    if (!lobbySnap.exists) {
      throw new Error('Lobby not found');
    }

    const lobbyData = lobbySnap.data() as any;
    return lobbyData?.allowSpectators;
  }

  async banPlayer(lobbyId: string, userId: string, userName: string) {
    if (userId.includes('#')) {
      return;
    }
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
    return await batch.commit();
  }

  async unbanPlayer(lobbyId: string, userId: string, userName: string) {
    if (userId.includes('#')) {
      return;
    }
    const batch = this.firestore.firestore.batch();
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      bannedPlayers: arrayRemove(userId),
      bannedPlayerNames: arrayRemove(userName),
    });
    return await batch.commit();
  }

  async kickUser(lobbyId: string, userId: string, userName: string): Promise<void> {
    if (userId.includes('#')) {
      return;
    }
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
    return await batch.commit();
  }

  async promotePlayer(lobbyId: string, userId: string, userName: string): Promise<void> {
    if (userId.includes('#')) {
      return;
    }
    const batch = this.firestore.firestore.batch();

    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;
    batch.update(lobbyRef, {
      ownerId: userId,
      ownerName: userName,
    });
    await batch.commit();
  }


  async renameUser(lobbyId: string, userId: string) {
    if (userId.includes('#')) {
      return;
    }
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;

    await this.firestore.firestore.runTransaction(async transaction => {
      const doc = await transaction.get(lobbyRef);
      if (!doc.exists) {
        throw new Error('Lobby not found');
      }

      const lobbyData = doc.data() as Lobby;
      const playerNames: string[] = lobbyData?.playerNames || [];
      const players: string[] = lobbyData?.players || [];

      const index = players.indexOf(userId);
      if (index === -1) {
        throw new Error('Player id not found in players array');
      }

      const usedNumbers = new Set<number>();
      for (const name of playerNames) {
        if (name.startsWith('player_')) {
          const num = parseInt(name.substring(7), 10);
          if (!isNaN(num)) {
            usedNumbers.add(num);
          }
        }
      }

      let randomNum: number;
      do {
        randomNum = Math.floor(Math.random() * 1000) + 1;
      } while (usedNumbers.has(randomNum));

      playerNames[index] = `player_${randomNum}`;
      transaction.update(lobbyRef, {playerNames});
    });
  }

  async kickAI(lobbyId: string, AIId: string, AIName: string) {
    if (!AIId.includes('#')) {
      return;
    }
    const lobbyRef = this.firestore.collection('lobbies').doc(lobbyId).ref;

    return this.firestore.firestore.runTransaction(async transaction => {
      const lobbyDoc = await transaction.get(lobbyRef);
      if (!lobbyDoc.exists) {
        throw new Error('Lobby does not exist');
      }

      const lobbyData = lobbyDoc.data() as Lobby;
      const players: string[] = lobbyData.players || [];


      let usedBotNumbers = 0
      for (let i = 0; i < players.length; i++) {
        const id = players[i];
        if (id.charAt(0) === '#' && id.length >= 5) {
          if (id.substring(0, 4) === "#bot") {
            const numPart = id.substring(4);
            const num = parseInt(numPart, 10);
            if (!isNaN(num)) {
              usedBotNumbers += 1;
            }
          }
        }
      }

      //Kitörlünk egy botot - ezért azt kell megnézni, hogy 1 bot van-e a kikickelés előtt
      transaction.update(lobbyRef, {
        hasBots: usedBotNumbers > 1,
        players: arrayRemove(AIId),
        playerNames: arrayRemove(AIName),
      });
    });

  }

  removeSpectatorsTags(lobbyData: any) {
    const batch = this.firestore.firestore.batch();

    for (const userId of lobbyData?.spectators) {
      if (!userId.includes('#')) {
        const userRef = this.firestore.doc('users/' + userId);

        batch.update(userRef.ref, {
          inLobby: null,
        });
      }
    }
  }
}


