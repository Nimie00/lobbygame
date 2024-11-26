import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {BehaviorSubject, Observable, of, tap} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';
import {SubscriptionTrackerService} from "./subscriptionTracker.service";
import {User} from "../models/user.model";



@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private CATEGORY = 'authService';
  private userSubject = new BehaviorSubject<User | null>(null);
  user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private tracker: SubscriptionTrackerService,
  ) {
    this.initUserTracking();
  }

  /**
   * Initializes user tracking to keep user cache up-to-date using getUserData.
   */
  private initUserTracking(): void {
    const subscription = this.getUserData()
      .pipe(
        tap(user => this.userSubject.next(user))
      )
      .subscribe();

    this.tracker.add(this.CATEGORY, 'initUserTracking', subscription);
  }

  /**
   * Gets user data from Firestore based on the current auth state.
   */
  getUserData(): Observable<User | null> {
    return this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          return this.afs.doc<User>(`users/${user.uid}`)
            .valueChanges()
            .pipe(
              map(userData => userData ? {...userData, id: user.uid} as User : null)
            );
        } else {
          return of(null);
        }
      })
    );
  }

  /**
   * Fetch fresh user data from the database and update cache.
   */
  refreshUser(): Observable<any> {
    return this.getUserData().pipe(
      tap(user => this.userSubject.next(user))
    );
  }

  /**
   * Checks if the user is logged in.
   */
  isUserLoggedIn(): Observable<boolean> {
    return this.user$.pipe(
      map(user => !!user)
    );
  }

  getUserObservable(): Observable<any> {
    return this.user$;
  }

  /**
   * Get the cached user data as a synchronous value.
   */
  getCachedUser(): User | null {
    return this.userSubject.value;
  }

  /**
   * Logs in a user with email and password.
   */
  async login(email: string, password: string) {
    try {
      const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);
      if (userCredential.user) {
        const id = userCredential.user.uid;
        const now = new Date();
        console.log(now);
        await this.afs.collection('users').doc(id).update({lastLoginAt: now});
        return userCredential;
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Registers a new user and saves their information in the database.
   */
  async register(email: string, password: string, username: string) {
    try {
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      if (userCredential.user) {
        const id = userCredential.user.uid;
        const now = new Date();
        const newUser: User = {
          id,
          username,
          email,
          registeredAt: now,
          lastLoginAt: now,
          inLobby: '',
          roles: ['user'],
          xp: 0,
          level: 0,
          badges: ['registered'],
        };
        await this.afs.collection('users').doc(id).set(newUser);
        return userCredential;
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Sends a password reset email to the given address.
   */
  resetPassword(email: string): Promise<void> {
    return this.afAuth.sendPasswordResetEmail(email);
  }

  /**
   * Logs out the current user.
   */
  logout(): Promise<void> {
    return this.afAuth.signOut();
  }
}
