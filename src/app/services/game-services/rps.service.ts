import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {combineLatest, from, Observable} from "rxjs";
import {map, switchMap} from "rxjs/operators";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {AuthService} from "../auth.service";
import {BaseGame} from "../../models/games.gameplaydata.model";
import {User} from "../../models/user.model";

@Injectable({
  providedIn: 'root'
})
export class RpsService {
  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private authService: AuthService,
  ) {
  }


  getGameState(lobbyId: string): Observable<any> {
    return this.firestore.collection('gameplay').doc(lobbyId).valueChanges();
  }

  makeChoice(lobbyId: string, choice: string): Observable<void> {
    return this.authService.getUserObservable().pipe(
      switchMap(user => {
        if (!user) throw new Error('No authenticated user');

        const gameDocRef = this.firestore.collection('gameplay').doc(lobbyId);
        return gameDocRef.get().pipe(
          switchMap(snapshot => {
            const gameData = snapshot.data() as BaseGame;
            if (!gameData || typeof gameData.currentRound !== 'number') {
              throw new Error('Invalid game data or currentRound not found');
            }

            const currentRoundNumber = gameData.currentRound;
            const currentRoundChoices = gameData.rounds?.[currentRoundNumber]?.choices || {};

            if (currentRoundChoices[user.id]) {
              throw new Error('User has already made a choice in this round');
            }

            const choicePath = `rounds.${currentRoundNumber}.choices.${user.id}`;
            const updateData = {
              [choicePath]: {
                choice,
                timestamp: new Date()
              }
            };

            return from(gameDocRef.update(updateData));
          })
        );
      }),
      map(() => void 0)
    );
  }




  getCurrentUserAndGame(lobbyId: string): Observable<{ user: any, game: any }> {
    return combineLatest([
      this.authService.refreshUser(),
      this.getGameState(lobbyId)
    ]).pipe(
      map(([user, game]) => ({user, game}))
    );
  }
}
