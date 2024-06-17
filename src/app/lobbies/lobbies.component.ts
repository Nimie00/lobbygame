import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LobbyService } from '../services/lobby.service';
import { CreateLobbyDialogComponent } from '../lobby-dialog/create-lobby-dialog.component';
import { Lobby } from '../lobby.model';

@Component({
  selector: 'app-lobbies',
  templateUrl: './lobbies.component.html',
  styleUrls: ['./lobbies.component.scss']
})
export class LobbiesComponent implements OnInit {
  lobbies: Lobby[] = [];
  page = 1;
  pageSize = 12;


  constructor(private lobbyService: LobbyService, private dialog: MatDialog) {
    console.log('LobbiesComponent constructor called'); // Debugging message
  }

  ngOnInit() {
    console.log('ngOnInit called'); // Debugging message
    this.lobbyService.getLobbies().subscribe(lobbies => {
      this.lobbies = lobbies;
    });
  }

  get paginatedLobbies(): Lobby[] {
    const start = (this.page - 1) * this.pageSize;
    return this.lobbies.slice(start, start + this.pageSize);
  }

  createLobby() {
    const dialogRef = this.dialog.open(CreateLobbyDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.lobbyService.createLobby(result).then(() => {
          console.log('Lobby created');
        });
      }
    });
  }

  joinLobby(lobbyId: string) {
    // Implement lobby joining logic
  }

  protected readonly String = String;
}
