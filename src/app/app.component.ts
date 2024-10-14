import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {NgIf} from "@angular/common";
import {Subscription} from "rxjs";

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
  private userSubscription: Subscription;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnDestroy() {
    if(this.userSubscription){
      this.userSubscription.unsubscribe();
    }
  }

  ngOnInit() {
    this.userSubscription = this.authService.getAuthState().subscribe(user => {
      this.isLoggedIn = !!user;
      this.activeGame = !!user && this.checkActiveGame(user.uid);
    });
  }

  checkActiveGame(userId: string): boolean {
    // Implement your logic to check if the user has an active game
    return true;
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
