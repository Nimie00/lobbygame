import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {Observable, shareReplay} from "rxjs";
import {map} from "rxjs/operators";
import {RPSGame} from "../../models/games.gameplaydata.model";

@Injectable({
  providedIn: 'root'
})
export class overallGameService {
  constructor(
    private firestore: AngularFirestore,
  ) {}

  private gameplayCache$: { [key: string]: Observable<RPSGame[]> } = {};

  getGames(playerId: string): Observable<RPSGame[]> {
    const cacheKey = `${playerId}`;

    if (!this.gameplayCache$[cacheKey]) {
      this.gameplayCache$[cacheKey] = this.firestore
        .collection<RPSGame>('gameplay', ref => ref.where('status', '==', 'ended').where('players', 'array-contains', playerId)
        )
        .snapshotChanges()
        .pipe(
          map(actions => {
            return actions.map(a => {
              const data = a.payload.doc.data() as RPSGame;
              const id = a.payload.doc.id;

              // Konvertáljuk a timestamp mezőket Date típusúvá
              const startedAt = data.startedAt ? (data.startedAt as any).toDate() : null;
              const endedAt = data.endedAt ? (data.endedAt as any).toDate() : null;

              return {
                ...data,
                id,
                startedAt,
                endedAt
              };
            });
          }),
          shareReplay({
            bufferSize: 1,
            refCount: true
          })
        );
    }

    return this.gameplayCache$[cacheKey];
  }
}
