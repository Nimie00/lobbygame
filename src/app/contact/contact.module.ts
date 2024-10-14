import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactComponent } from './contact.component';
import { RouterModule, Routes } from '@angular/router';
import {ContactRoutingModule} from "./contact-routing.module";
import {IonicModule} from "@ionic/angular";

const routes: Routes = [
  { path: '', component: ContactComponent }
];

@NgModule({
  declarations: [ContactComponent],
  imports: [
    CommonModule,
    ContactRoutingModule,
    IonicModule,
  ]
})
export class ContactModule { }
