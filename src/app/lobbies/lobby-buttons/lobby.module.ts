import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LobbyComponent } from './lobby.component';
import {FormsModule} from "@angular/forms";
import {CreateLobbyModalModule} from "../create-lobby-modal/create-lobby-modal.module";
import {LobbyPlayersManagingModule} from "../lobby-players-managing-modal/lobby-players-managing.module";

@NgModule({
  declarations: [LobbyComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CreateLobbyModalModule,
    LobbyPlayersManagingModule,
  ],
  exports: [LobbyComponent]
})
export class LobbyModule { }
