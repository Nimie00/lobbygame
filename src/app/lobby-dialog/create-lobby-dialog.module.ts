import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Importáld a FormsModule-t
import { MatDialogModule } from '@angular/material/dialog';
import { CreateLobbyDialogComponent } from './create-lobby-dialog.component';
import {CreateLobbyDialogRoutingModule} from "./create-lobby-dialog-routing.module";

@NgModule({
  declarations: [
    CreateLobbyDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    CreateLobbyDialogRoutingModule
  ],
  exports: [
    CreateLobbyDialogComponent
  ]
})
export class CreateLobbyDialogModule { }
