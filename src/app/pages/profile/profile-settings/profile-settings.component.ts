import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '../../../shared/services/auth.service';
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {User} from "../../../shared/models/user.model";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'app-profile-settings',
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss']
})
export class ProfileSettingsComponent  implements OnInit, OnDestroy {
  @Input() user: User;
  private CATEGORY = "profileSettings"
  currentUser: any;
  form: any = {
    username: '',
    email: '',
    password: '',
  };
  confirmEmail = '';
  confirmPassword = '';
  profilePictures: string[] = [];
  selectedPicture: string | null = null;

  constructor(private authService: AuthService,
              private tracker: SubscriptionTrackerService,
              private http: HttpClient) {}

  ngOnInit() {
    this.loadProfilePictures();
      this.currentUser = this.user;
      this.form.username = this.currentUser.username;
      this.form.email = this.currentUser.email;
      this.selectedPicture = this.currentUser.picture || null;
    }

  onProfilePictureSelect(picture: string) {
    this.selectedPicture = picture;
  }


  loadProfilePictures() {
    this.http.get<string[]>('assets/profilePictures/profile-pictures.json').subscribe({
      next: (pictures) => {
        console.log(pictures);
        this.profilePictures = pictures;
      },
      error: (err) => {
        console.error('Failed to load profile pictures:', err);
      },
    });
  }

  canSubmit(): boolean {
    return (
      this.currentUser.email === this.confirmEmail &&
      this.form.email !== '' &&
      this.form.password !== ''
    );
  }

  async onSubmit() {
    if (!this.canSubmit) {
      console.error('Form validation failed.');
      return;
    }

    try {
      // Ellenőrizzük az emailt és a jelszót
      await this.authService.reauthenticateUser(this.confirmEmail, this.confirmPassword);

      // Adatok frissítése
      const updates: any = {};
      if (this.form.email !== this.currentUser.email) {
        await this.authService.updateEmail(this.form.email);
        updates.email = this.form.email;
      }
      if (this.form.password) {
        await this.authService.updatePassword(this.form.password);
      }
      if (this.form.username) {
        updates.username = this.form.username;
      }
      if (this.form.profilePicture) {
        updates.profilePicture = this.form.profilePicture;
      }

      // Mentés az adatbázisba
      await this.authService.updateUserProfile(this.currentUser.uid, updates);
      console.log('Felhasználói adatok sikeresen frissítve!');
    } catch (error) {
      console.error('Hiba történt a frissítés során:', error.message);
    }
  }

  onDeleteProfile() {
    console.log('Delete profile action triggered');
    // TODO: Implement delete logic
  }




  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }
}
