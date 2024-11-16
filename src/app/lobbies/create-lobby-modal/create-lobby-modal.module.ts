import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CreateLobbyModalComponent } from './create-lobby-modal.component';
import {FormsModule} from "@angular/forms";

@NgModule({
  declarations: [CreateLobbyModalComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  exports: [CreateLobbyModalComponent]
})
export class CreateLobbyModalModule { }
