import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {combineLatest, from, Observable} from "rxjs";
import {map, switchMap} from "rxjs/operators";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {AuthService} from "../auth.service";

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
        return from(this.firestore.collection('gameplay').doc(lobbyId).update({
          [`choices.${user.id}`]: choice
        }));
      }),
      map(() => void 0)
    );
  }


  getCurrentUserAndGame(lobbyId: string): Observable<{ user: any, game: any }> {
    return combineLatest([
      this.auth.user,
      this.getGameState(lobbyId)
    ]).pipe(
      map(([user, game]) => ({user, game}))
    );
  }

  async updateGameResult(lobbyId: string, winner: string | null) {
    const gameRef = this.firestore.doc('gameplay/' + lobbyId);
    return gameRef.update({ winner, status: 'ended' });
  }
}
