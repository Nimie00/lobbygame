import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Importáld a FormsModule-t
import { LoginComponent } from './login.component';
import { LoginRoutingModule } from "./login-routing.module";
import { IonicModule } from "@ionic/angular";
import {CommonModule} from "@angular/common";

@NgModule({
  declarations: [LoginComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    FormsModule,
    LoginRoutingModule,
  ]
})
export class LoginModule { }
