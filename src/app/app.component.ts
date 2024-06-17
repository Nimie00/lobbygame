import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isLoggedIn: boolean = false;
  activeGame: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.getAuthState().subscribe(user => {
      this.isLoggedIn = !!user;
      // Placeholder logic for active game, replace with your actual logic
      this.activeGame = !!user && this.checkActiveGame(user.uid);
    });
  }

  checkActiveGame(userId: string): boolean {
    // Implement your logic to check if the user has an active game
    return false; // Placeholder return value
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
