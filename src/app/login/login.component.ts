import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    const cleanUsername = this.username.trim().substring(0, 30);
    this.authService.loginAnonymously(cleanUsername).then(() => {
      this.router.navigate(['/profile']);
    }).catch(error => {
      console.error("Login error: ", error);
    });
  }
}
