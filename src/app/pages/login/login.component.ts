import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '../../shared/services/auth.service';
import {Router} from '@angular/router';
import {LanguageService} from "../../shared/services/language.service";
import {SubscriptionTrackerService} from "../../shared/services/subscriptionTracker.service";
import {AlertService} from "../../shared/services/alert.service";
import {AudioService} from "../../shared/services/audio.service";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private CATEGORY = "login"
  isLogin = true;
  email: string;
  password: string;
  regUsername: string;
  regEmail: string;
  regPassword: string;


  constructor(private authService: AuthService,
              private router: Router,
              private languageService: LanguageService,
              private tracker: SubscriptionTrackerService,
              private alertService: AlertService,
              private audioService: AudioService,
  ) {
  }

  async ngOnInit() {
    const watchSubscription = this.authService.getUserObservable().subscribe(user => {
      if (user) {
        this.router.navigate(['/profile']);
      }
    });

    this.tracker.add(this.CATEGORY, "getGameAndUserSub", watchSubscription);
  }

  async ngOnDestroy() {
    this.tracker.unsubscribeCategory(this.CATEGORY);
    this.audioService.stopAllSounds();
  }

  toggleCard() {
    this.isLogin = !this.isLogin;
  }

  async login() {
    try {
      await this.authService.login(this.email, this.password);
      await this.router.navigate(['/profile'], {queryParams: {reload: Date.now()}});
    } catch (error) {
      await this.alertService.showAlert(
        `${this.languageService.translate("ERROR")}`,
        `${this.languageService.translate("INVALID_LOGIN_CREDENTIALS")}.`
      );
    }
  }

  async register() {
    if (this.regPassword.length < 6) {
      await this.alertService.showAlert(
        `${this.languageService.translate("ERROR")}`,
        `${this.languageService.translate("WEAK_PASSWORD")}.`);
      return;
    }

    if (this.regUsername.includes('#')) {
      await this.alertService.showAlert(
        `${this.languageService.translate("ERROR")}`,
        `${this.languageService.translate("BAD_USERNAME")}.`);
      return;
    }


    this.authService.register(this.regEmail, this.regPassword, this.regUsername)
      .then(async () => {
        await this.alertService.showAlert(
          `${this.languageService.translate("SUCCESS")}`,
          `${this.languageService.translate("REGISTRATION_SUCCESSFUL")}!`);
        this.toggleCard();
        await this.router.navigate(['/profile']);
      })
      .catch(async error => {
        console.error('Regisztrációs hiba:', error);
        if (error.code === 'auth/email-already-in-use') {
          await this.alertService.showAlert(
            `${this.languageService.translate("ERROR")}`,
            `${this.languageService.translate("EMAIL_IN_USE")}.`);
        } else if (error.code === 'auth/invalid-email') {
          await this.alertService.showAlert(
            `${this.languageService.translate("ERROR")}`,
            `${this.languageService.translate("INVALID_EMAIL")}.`);
        } else {
          await this.alertService.showAlert(
            `${this.languageService.translate("ERROR")}`,
            `${this.languageService.translate("UNKNOWN_ERROR")}.`);
        }
      });
  }

  async forgotPassword() {
    if (this.email == null || this.email.length < 6) {
      await this.alertService.showAlert(
        `${this.languageService.translate("ERROR")}`,
        `${this.languageService.translate("INVALID_EMAIL")}.`);
      return;
    }

    this.authService.resetPassword(this.email)
      .then(async () => {
        await this.alertService.showAlert(
          `${this.languageService.translate("SUCCESS")}`,
          `${this.languageService.translate("REMINDER_EMIL_SENT")}.`);
      })
      .catch(async error => {
        await this.alertService.showAlert(
          `${this.languageService.translate("ERROR")}`,
          `${this.languageService.translate("RESET_PASSWORD_ERROR")}.`);
      });
  }
}
