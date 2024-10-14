import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import {Subscription} from "rxjs";
import {AngularFireAuth} from "@angular/fire/compat/auth";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: any;
  private dataSubscription: Subscription;

  constructor(private afAuth: AngularFireAuth, private authService: AuthService) {}


  ngOnDestroy() {
    if(this.dataSubscription){
      this.dataSubscription.unsubscribe();
    }
  }
  ngOnInit() {
   this.dataSubscription = this.authService.getUserData().subscribe(data => {
      this.user = data;
    });
    // this.lobbyWatcher.subscribeToLobbyChanges();
  }
}
