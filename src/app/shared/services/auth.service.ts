import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {Observable, of, shareReplay} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';
import {update} from "@angular/fire/database";
import firebase from "firebase/compat/app";


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;
  private isLoggedIn = false;


  constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {
    this.user$ = this.getUserData().pipe(
      shareReplay({
        bufferSize: 1,
        refCount: true
      })
    );
  }



  getUserData(): Observable<any> {
    return this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          return this.afs.doc<{ [key: string]: any }>(`users/${user.uid}`).valueChanges().pipe(
            map(userData => userData ? { ...userData, id: user.uid } : null),
            shareReplay({
              bufferSize: 1,
              refCount: true
            })
          );
        } else {
          console.warn('No authenticated user found.');
          return of(null);
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
        const id = userCredential.user.uid;
        const now = new Date();
        await this.afs.collection('users').doc(id).update({
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
        const id = user.uid;
        const now = new Date();
        await this.afs.collection('users').doc(id).set({
          id: id,
          username: username,
          email: email,
          registeredAt: now,
          lastLoginAt: now,
          inLobby: "",
          roles: ['user'],
          xp: 0,
          level: 0,
          badges: ['registered'],
          picture: "picture0.png",
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

  reauthenticateUser(email: string, password: string) {
    const credential = firebase.auth.EmailAuthProvider.credential(email, password);
    return this.afAuth.currentUser.then(user => {
      if (user) {
        return user.reauthenticateWithCredential(credential);
      } else {
        throw new Error('User not found!');
      }
    });
  }

  // Felhasználó adatainak módosítása
  updateUserProfile(uid: string, data: { username?: string; profilePicture?: string; email?: string }): Promise<void> {
    return this.afs.doc(`users/${uid}`).update(data);
  }

  // Email módosítása
  updateEmail(newEmail: string): Promise<void> {
    return this.afAuth.currentUser.then(user => {
      return user?.updateEmail(newEmail);
    });
  }

  // Jelszó módosítása
  updatePassword(newPassword: string): Promise<void> {
    return this.afAuth.currentUser.then(user => {
      return user?.updatePassword(newPassword);
    });
  }
}
