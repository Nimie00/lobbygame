import { Component } from '@angular/core';

@Component({
  selector: 'app-lobbies',
  templateUrl: './lobbies.component.html',
  styleUrls: ['./lobbies.component.scss']
})
export class LobbiesComponent {
  lobbies = [];
  constructor() {
    // Initialize with some dummy data
    this.lobbies = [];
  }
}
