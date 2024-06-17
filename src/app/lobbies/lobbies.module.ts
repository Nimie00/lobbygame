import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LobbiesRoutingModule } from './lobbies-routing.module';
import { LobbiesComponent } from './lobbies.component';


@NgModule({
  declarations: [
    LobbiesComponent
  ],
  imports: [
    CommonModule,
    LobbiesRoutingModule
  ]
})
export class LobbiesModule { }
