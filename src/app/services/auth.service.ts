import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {Observable, of} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;
  private isLoggedIn = false;

  constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {
    this.user$ = this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          return this.afs.doc<any>(`users/${user.uid}`).valueChanges();
        } else {
          return of(null);
        }
      })
    );
  }


  getUserData(): Observable<any> {
    return this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          return this.afs.doc(`users/${user.uid}`).valueChanges();
        }
      })
    );
  }

  isUserLoggedIn(): Observable<boolean> {
    return this.afAuth.authState.pipe(map(user => !!user));
  }

  getCurrentUserIdObservable(): Observable<string | null> {
    return this.afAuth.authState.pipe(
      map(user => user ? user.uid : null)
    );
  }

  getAuthStateObservable(): Observable<any> {
    return this.afAuth.authState;
  }

  getUserObservable(): Observable<any> {
    return this.user$;
  }

  async login(email: string, password: string) {
    try {
      const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);
      if (userCredential.user) {
        const uid = userCredential.user.uid;
        const now = new Date();
        await this.afs.collection('users').doc(uid).update({
          lastLoginAt: now
        });
        this.isLoggedIn = true;
        return userCredential;
      } else {
      }
    } catch (error) {
      console.error('Bejelentkezési hiba:', error);
    }
  }

  async register(email: string, password: string, username: string) {
    try {
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      if (userCredential.user) {
        const user = userCredential.user;
        const uid = user.uid;
        const now = new Date();
        await this.afs.collection('users').doc(uid).set({
          uid: uid,
          username: username,
          email: email,
          registeredAt: now,
          lastLoginAt: now,
          inlobby: "",
          roles: ['user']
        });
        return userCredential;
      } else {
        throw new Error('User creation failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }


  resetPassword(email: string) {
    return this.afAuth.sendPasswordResetEmail(email);
  }

  logout() {
    this.isLoggedIn = false;
    return this.afAuth.signOut();
  }
}

