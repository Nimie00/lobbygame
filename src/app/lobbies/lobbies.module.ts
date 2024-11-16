import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LobbiesComponent } from './lobbies.component';
import { FormsModule } from '@angular/forms';
import { LobbiesRoutingModule } from "./lobbies-routing.module";
import {MatDialogModule} from "@angular/material/dialog";
import {IonicModule} from "@ionic/angular";
import {LobbyModule} from "./lobby-buttons/lobby.module";
import {CreateLobbyModalModule} from "./create-lobby-modal/create-lobby-modal.module";
import {LobbyPlayersManagingModule} from "./lobby-players-managing-modal/lobby-players-managing.module";
@NgModule({
  declarations: [LobbiesComponent],
  imports: [
    CreateLobbyModalModule,
    CommonModule,
    FormsModule,
    LobbyModule,
    LobbiesRoutingModule,
    MatDialogModule,
    LobbyPlayersManagingModule,
    IonicModule,
  ]
})
export class LobbiesModule { }
