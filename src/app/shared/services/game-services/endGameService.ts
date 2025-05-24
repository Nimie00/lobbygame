import {Injectable} from "@angular/core";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Lobby} from "../../models/lobby.model";

@Injectable({ providedIn: 'root' })
export class EndGameService {
  constructor(
    private firestore: AngularFirestore,
  ){}


  public async endLobby(
    lobbyId: string,
    winner: string,
    endReason: string,
    game: any
  ): Promise<void> {
    const db = this.firestore.firestore;

    try {
      await db.runTransaction(async (transaction) => {
        const lobbyRef = db.doc(`lobbies/${lobbyId}`);
        const lobbySnap = await transaction.get(lobbyRef);

        if (!lobbySnap.exists) {
          throw new Error('Lobby not found');
        }

        const lobbyData = lobbySnap.data() as Lobby;
        const players = lobbyData?.players || [];
        const spectators = lobbyData?.spectators || [];

        let playersXP: Record<string, number>;
        switch(game.gameType) {
          case "RPS":
            playersXP = this.calculateXpForRps(players, game);
            break;
          case "CARD":
            playersXP = this.calculateXpForCard(players, game);
            break;
          default:
            throw new Error('Unknown game type');
        }

        const totalXP = players.reduce((sum, p) => sum + (playersXP[p] || 0), 0);
        const averageXP = players.length > 0 ? totalXP / players.length : 0;
        spectators.forEach(s => playersXP[s] = Math.floor(averageXP / 3));

        const userUpdatePromises = [...players, ...spectators]
          .filter(userId => !userId.includes('#'))
          .map(async userId => {
            const userRef = db.doc(`users/${userId}`);
            const userSnap = await transaction.get(userRef);

            if (!userSnap.exists) return;

            const currentXP = (userSnap.data()?.xp || 0) as number;
            const newXP = currentXP + (playersXP[userId] || 0);

            const calculateLevel = (xp: number) => {
              let level = 1;
              let xpNeeded = Math.floor((level ** 1.1262) * 100);
              while (xp >= xpNeeded) {
                level++;
                xpNeeded = Math.floor((level ** 1.1262) * 100);
              }
              return { level: level - 1, xpNeeded };
            };

            const { level, xpNeeded } = calculateLevel(newXP);

            transaction.update(userRef, {
              inLobby: null,
              inGame: null,
              playingGame: null,
              xp: newXP,
              level,
              xpForNextLevel: xpNeeded
            });
          });

        await Promise.all(userUpdatePromises);

        transaction.update(lobbyRef, { status: 'ended' });
      });
    } catch (error) {
      throw error;
    }
  }


  calculateXpForRps(players: string[], game: { rounds: Record<string, { winner: string | null }> }): Record<string, number> {
    const playersXP: Record<string, number> = {};

    players.forEach(playerId => {
      let wins = 0;
      let ties = 0;
      let losses = 0;

      Object.values(game.rounds).forEach(round => {
        if (round.winner === playerId) {
          wins++;
        } else if (round.winner === null) {
          ties++;
        } else {
          losses++;
        }
      });

      playersXP[playerId] = Math.floor(wins * 30 + ties * 10 + losses * 5);
    });

    return playersXP;
  }

  calculateXpForCard(
    players: string[],
    game: {
      rounds: Record<string, { choices: Record<string, any> }>,
      placements: string[]
    }
  ): Record<string, number> {
    const playersXP: Record<string, number> = {};
    const minimumXP = 34;

    players.forEach(playerId => {
      let wonRounds = 0;

      Object.values(game.rounds).forEach(round => {
        if (round.choices[playerId]) {
          wonRounds++;
        }
      });

      let placement = game.placements.indexOf(playerId);
      let placementPoints = 0;

      if (placement !== -1) {
        const totalPlayers = game.placements.length;

        if (placement === 0) {
          placementPoints = 50 + (totalPlayers - 2) * 5;
        } else if (placement === totalPlayers - 1) {
          placementPoints = 15;
        } else {
          const step = (50 + (totalPlayers - 2) * 5 - 15) / (totalPlayers - 1);
          placementPoints = Math.floor(50 + (totalPlayers - 2) * 5 - step * placement);
        }
      }

      const roundXP = wonRounds * 10;
      const totalXP = roundXP + placementPoints;

      playersXP[playerId] = Math.max(minimumXP, Math.floor(totalXP));
    });

    return playersXP;
  }
}
