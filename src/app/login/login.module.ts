import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Importáld a FormsModule-t
import { LoginComponent } from './login.component';
import {LoginRoutingModule} from "./login-routing.module";
import {MatDialogModule} from "@angular/material/dialog";

@NgModule({
  declarations: [LoginComponent],
  imports: [
    CommonModule,
    FormsModule,
    LoginRoutingModule,
    MatDialogModule
  ]
})
export class LoginModule { }
