import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  constructor(private authService: AuthService) {}

  getUserProfile() {
    return this.authService.user$;
  }

  updateUsername(newUsername: string): Promise<void> {
    return this.authService.updateUsername(newUsername);
  }
}
