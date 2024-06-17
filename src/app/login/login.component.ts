import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username: string | undefined;

  constructor(private afAuth: AngularFireAuth) {}

  login() {
    this.afAuth.signInAnonymously().then(user => {
      if (user.user) {
        user.user.updateProfile({
          displayName: this.username
        });
      }
    });
  }
}
