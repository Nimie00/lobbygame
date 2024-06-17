import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Lobby } from '../lobby.model';

@Component({
  selector: 'app-create-lobby-dialog',
  templateUrl: './create-lobby-dialog.component.html',
  styleUrls: ['./create-lobby-dialog.component.scss']
})
export class CreateLobbyDialogComponent {
  lobby: Partial<Lobby> = {};

  constructor(public dialogRef: MatDialogRef<CreateLobbyDialogComponent>) {}

  createLobby() {
    this.dialogRef.close(this.lobby);
  }

  cancel() {
    this.dialogRef.close();
  }
}
