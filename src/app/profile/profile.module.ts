import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms'; // Importáld a FormsModule-t
import {ProfileComponent} from './profile.component';
import {ProfileRoutingModule} from "./profile-routing.module";
import {IonicModule} from "@ionic/angular";

@NgModule({
  declarations: [ProfileComponent],
  imports: [
    CommonModule,
    FormsModule,
    ProfileRoutingModule,
    IonicModule
  ]
})
export class ProfileModule {
}
