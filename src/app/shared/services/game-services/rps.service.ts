import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {combineLatest, Observable} from "rxjs";
import {map} from "rxjs/operators";
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

  makeChoice(lobbyId: string, choice: string, userId: string, currentRound: number): boolean {
    try {
      const gameDocRef = this.firestore.collection('gameplay').doc(lobbyId);

      const choicePath = `rounds.${currentRound}.choices.${userId}`;
      const updateData = {
        [choicePath]: {
          choice,
          timestamp: new Date()
        }
      };

      gameDocRef.update(updateData);
      return true;
    } catch (error) {
      console.error('Error during choice saving:', error);
      return false;
    }
  }


  getCurrentUserAndGame(lobbyId: string): Observable<{ user: any, game: any }> {
    return combineLatest([
      this.authService.getUserData(),
      this.getGameState(lobbyId)
    ]).pipe(
      map(([user, game]) => ({user, game}))
    );
  }
}
