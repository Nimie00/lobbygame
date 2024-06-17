import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LobbiesComponent } from './lobbies.component';
import { FormsModule } from '@angular/forms';
import { LobbiesRoutingModule } from "./lobbies-routing.module";
import {MatDialogModule} from "@angular/material/dialog";
@NgModule({
  declarations: [LobbiesComponent],
  imports: [
    CommonModule,
    FormsModule,
    LobbiesRoutingModule,
    MatDialogModule,
  ]
})
export class LobbiesModule { }
