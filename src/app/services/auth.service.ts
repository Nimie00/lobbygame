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

  private updateUserData(user: any, username: string): Promise<void> {
    const userRef = this.afs.doc(`users/${user.uid}`);
    const data = {
      uid: user.uid,
      username: username,
      lastLogin: new Date()
    };
    return userRef.set(data, {merge: true});
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

  async updateUsername(newUsername: string): Promise<void> {
    const cleanUsername = newUsername.trim().substring(0, 30);
    const user = await this.afAuth.currentUser;
    if (user) {
      const userRef = this.afs.doc(`users/${user.uid}`);
      return userRef.update({username: cleanUsername});
    } else {
      return Promise.reject('No user is currently logged in.');
    }
  }

  isAuthenticated(): Observable<boolean> {
    return this.afAuth.authState.pipe(
      map(user => !!user)
    );
  }

  getCurrentUserId(): Observable<string | null> {
    return this.afAuth.authState.pipe(
      map(user => user ? user.uid : null)
    );
  }

  getAuthState(): Observable<any> {
    return this.afAuth.authState;
  }

  getUser(): Observable<any> {
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

        return userCredential;
      } else {
        throw new Error('Bejelentkezés sikertelen');
      }
    } catch (error) {
      console.error('Bejelentkezési hiba:', error);
      throw error;
    }
  }

  async register(email: string, password: string, username: string) {
    try {
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(email, password);

      if (userCredential.user) {
        const user = userCredential.user;
        const uid = user.uid;
        const now = new Date();

        // Create a user document in the 'users' collection
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
    return this.afAuth.signOut();
  }
}

