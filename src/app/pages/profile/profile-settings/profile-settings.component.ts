import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '../../../shared/services/auth.service';
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {User} from "../../../shared/models/user.model";
import {HttpClient} from "@angular/common/http";
import {LanguageService} from "../../../shared/services/language.service";
import {Router} from "@angular/router";
import {AlertService} from "../../../shared/services/alert.service";

@Component({
  selector: 'app-profile-settings',
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss']
})
export class ProfileSettingsComponent implements OnInit, OnDestroy {
  private CATEGORY = "profileSettings"
  @Input() user: User;

  userInLobby: boolean = false;
  isDeleteSelected: boolean = false;
  confirmPassword: string = '';
  selectedPicture: string | null = null;
  profilePictures: string[] = [];
  selectedOptions: Set<string> = new Set<string>();

  availableOptions = [
    {value: 'picture', label: 'PROFILE_PICTURE'},
    {value: 'username', label: 'USERNAME'},
    {value: 'password', label: 'PASSWORD'},
  ];

  form = {
    username: '',
    password: '',
  };

  deleteData = {
    username: '',
    email: '',
    password: ''
  };

  constructor(private authService: AuthService,
              private tracker: SubscriptionTrackerService,
              private http: HttpClient,
              private languageService: LanguageService,
              private router: Router,
              private alertService: AlertService,
  ) {
  }

  ngOnInit() {
    this.loadProfilePictures();
    this.selectedPicture = this.user.picture || null;
    this.userInLobby = this.user.inLobby != null;
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  onProfilePictureSelect(picture: string) {
    this.selectedPicture = picture.split('.')[0];
  }

  toggleDelete() {
    this.isDeleteSelected = !this.isDeleteSelected;
    if (this.isDeleteSelected) {
      this.selectedOptions.clear();
    }
  }

  toggleOption(option: string) {
    if (this.selectedOptions.has(option)) {
      this.selectedOptions.delete(option);
    } else {
      this.selectedOptions.add(option);
    }
  }

  isDeleteFormValid(): boolean {
    return this.deleteData.username !== '' &&
      this.deleteData.email !== '' &&
      this.deleteData.password !== '';
  }

  async onDeleteProfile() {
    if (this.userInLobby) {
      await this.showError(`${this.languageService.translate('CANT_DELETE_WHILE_IN_LOBBY')}`);
      return;
    }

    try {
      await this.authService.reauthenticateUser(this.deleteData.email, this.deleteData.password);

      if (this.deleteData.username !== this.user.username) {
        await this.showError(`${this.languageService.translate('INVALID_USERNAME')}`);
        return;
      }
      await this.authService.deleteUser();
      await this.router.navigate(['/login/']);
    } catch (error) {
      await this.showError(`${this.languageService.translate('AUTH_FAILED')}`);
    }
  }

  async onSubmit() {
    if (this.userInLobby) {
      await this.showError(`${this.languageService.translate('CANT_CHANGE_WHILE_IN_LOBBY')}`);
      return;
    }

    try {
      await this.authService.reauthenticateUser(this.user.email, this.confirmPassword);

      let updates: any = {};

      if (this.selectedOptions.has('username')) {
        if (!this.form.username.includes('#')) {
          if (await this.isUserNameUsable()) {
            updates.username = this.form.username;
          } else {
            await this.showError(`${this.languageService.translate('USERNAME_TAKEN')}`);
            return;
          }
        } else {
          await this.showError(`${this.languageService.translate('USERNAME_CONTAINS_ILLEGAL_CHARACTER')}`);
          return;
        }

      }

      if (this.selectedOptions.has('password')) {
        await this.authService.updatePassword(this.form.password);
      }

      if (this.selectedOptions.has('picture')) {
        updates.picture = this.selectedPicture;
      }

      if (Object.values(updates).filter(value => value !== "").length > 0) {
        await this.authService.updateUserProfile(this.user.id, updates);
      }


      await this.showSuccess(`${this.languageService.translate('CHANGES_SAVED')}`);
      this.resetFormValues();
    } catch (error) {
      await this.handleError(error);
    }
  }

  private async handleError(error: any) {
    let errorMessage = 'UNKNOWN_ERROR';

    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'EMAIL_IN_USE';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'REAUTHENTICATION_REQUIRED';
          break;
        case 'auth/weak-password':
          errorMessage = 'WEAK_PASSWORD';
          break;
        case 'auth/user-not-found':
          errorMessage = 'USER_NOT_FOUND';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'NETWORK_ERROR';
          break;
        case 'auth/wrong-password':
          errorMessage = 'INVALID_PASSWORD';
          break;
      }
    }

    let message = `${this.languageService.translate(errorMessage)}`
    await this.showError(message);
  }

  private async showSuccess(changesSaved: string) {
    await this.alertService.showAlert(
      `${this.languageService.translate('SUCCESS')}`,
      changesSaved);
  }

  private async showError(message: string) {
    await this.alertService.showAlert(
      `${this.languageService.translate('ERROR')}`,
      message);
  }

  private loadProfilePictures() {
    const pictureSub = this.http.get<string[]>('assets/profilePictures/profile-pictures.json').subscribe({
      next: (pictures) => {
        this.profilePictures = pictures;
      },
      error: (err) => {
        console.error('Failed to load profile pictures:', err);
      },
    });
    this.tracker.add(this.CATEGORY, "jsonLoadSub", pictureSub);
  }

  private async isUserNameUsable() {
    if (this.form.username === this.user.username) return false;

    try {
      return await this.authService.checkUsernameAvailable(this.form.username);
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  }

  private resetFormValues() {
    this.form.username = '';
    this.form.password = '';
    this.confirmPassword = '';
  }
}
