import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private afAuth: AngularFireAuth) {}

  loginAnonymously(): Promise<any> {
    return this.afAuth.signInAnonymously();
  }

  updateUsername(username: string): Promise<void> {
    return this.afAuth.currentUser.then(user => {
      if (user) {
        return user.updateProfile({
          displayName: username
        });
      }
      return Promise.reject('No user logged in');
    });
  }

  getAuthState(): Observable<any> {
    return this.afAuth.authState;
  }

  logout(): Promise<void> {
    return this.afAuth.signOut();
  }
}
