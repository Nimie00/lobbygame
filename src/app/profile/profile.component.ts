import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  user: any;
  newUsername: string | undefined;

  constructor(private afAuth: AngularFireAuth) {
    this.afAuth.authState.subscribe(user => {
      this.user = user;
    });
  }

  updateUsername() {
    if (this.user) {
      this.user.updateProfile({
        displayName: this.newUsername
      }).then(() => {
        this.newUsername = '';
      });
    }
  }
}
