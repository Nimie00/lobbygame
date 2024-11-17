import {Component} from '@angular/core';
import {AuthService} from '../services/auth.service';
import {Router} from '@angular/router';
import {AlertController} from "@ionic/angular";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  isLogin = true;
  email: string;
  password: string;
  regUsername: string;
  regEmail: string;
  regPassword: string;

  constructor(private authService: AuthService,
              private router: Router,
              private alertController: AlertController,
              ) {
  }

  toggleCard() {
    this.isLogin = !this.isLogin;
  }

  async login() {
    this.authService.login(this.email, this.password)
      .then(() => {
        console.log('Bejelentkezve');
        this.router.navigate(['/profile'], { queryParams: { reload: Date.now() } });
      })
      .catch(error => {
        console.error('Bejelentkezési hiba:', error);
        this.showAlert('Hiba', 'Helytelen felhasználónév vagy jelszó.');
      });
  }

  async register() {
    if (this.regPassword.length < 6) {
      await this.showAlert('Hiba', 'A jelszónak legalább 6 karakter hosszúnak kell lennie.');
      return;
    }

    this.authService.register(this.regEmail, this.regPassword, this.regUsername)
      .then(() => {
        console.log('Regisztráció sikeres');
        this.showAlert('Sikeres', 'Regisztráció sikeres!');
        this.toggleCard();
        this.router.navigate(['/profile']);
      })
      .catch(error => {
        console.error('Regisztrációs hiba:', error);
        if (error.code === 'auth/email-already-in-use') {
          this.showAlert('Hiba', 'Ez az email cím már használatban van.');
        } else if (error.code === 'auth/invalid-email') {
          this.showAlert('Hiba', 'Érvénytelen email cím.');
        } else {
          this.showAlert('Hiba', 'Regisztrációs hiba történt. Kérjük, próbálja újra később.');
        }
      });
  }

  forgotPassword() {
    this.authService.resetPassword(this.email)
      .then(() => {
        console.log('Jelszó emlékeztető email elküldve');
      })
      .catch(error => {
        console.error('Hiba a jelszó visszaállításánál:', error);
      });
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });

    await alert.present();
  }
}
