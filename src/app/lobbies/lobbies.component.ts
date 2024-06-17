import { Component } from '@angular/core';
import { Lobby } from '../lobby.model'; // import the interface

@Component({
  selector: 'app-lobbies',
  templateUrl: './lobbies.component.html',
  styleUrls: ['./lobbies.component.scss']
})
export class LobbiesComponent {
  lobbies: Lobby[] = [
    { id: 1, name: 'Lobby 1', owner: 'User1', players: 3, started: false },
    { id: 2, name: 'Lobby 2', owner: 'User2', players: 2, started: true }
  ];

  createLobby() {
    const newLobby: Lobby = { id: 3, name: 'New Lobby', owner: 'CurrentUser', players: 1, started: false };
    this.lobbies.push(newLobby);
  }

  joinLobby(id: number) {
    console.log(`Joining lobby with id ${id}`);
  }
}
