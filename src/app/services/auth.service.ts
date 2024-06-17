import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import {switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;

  constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {
    this.user$ = this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          return this.afs.doc<any>(`users/${user.uid}`).valueChanges();
        } else {
          return null;
        }
      })
    );
  }

  async loginAnonymously(username: string): Promise<any> {
    const credential = await this.afAuth.signInAnonymously();
    return await this.updateUserData(credential.user, username);
  }

  private updateUserData(user: any, username: string): Promise<void> {
    const userRef = this.afs.doc(`users/${user.uid}`);
    const data = {
      uid: user.uid,
      username: username,
      lastLogin: new Date()
    };
    return userRef.set(data, { merge: true });
  }

  async updateUsername(newUsername: string): Promise<void> {
    const cleanUsername = newUsername.trim().substring(0, 30);
    return await this.afAuth.currentUser.then(user => {
      if (user) {
        const userRef = this.afs.doc(`users/${user.uid}`);
        return userRef.update({ username: cleanUsername });
      } else {
        return Promise.reject('No user is currently logged in.');
      }
    });
  }

  isAuthenticated(): boolean {
    return !!this.afAuth.currentUser;
  }

  getAuthState(): Observable<any> {
    return this.afAuth.authState;
  }

  getUser() {
    return this.afAuth.authState;
  }

  login(email: string, password: string) {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  logout() {
    return this.afAuth.signOut();
  }
}
