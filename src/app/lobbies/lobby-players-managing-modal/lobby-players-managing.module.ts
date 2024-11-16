import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LobbyPlayersManagingComponent } from './lobby-players-managing.component';
import {FormsModule} from "@angular/forms";

@NgModule({
  declarations: [LobbyPlayersManagingComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  exports: [LobbyPlayersManagingComponent]
})
export class LobbyPlayersManagingModule { }
