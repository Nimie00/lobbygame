import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RpsComponent} from './rps.component';
import {IonicModule} from "@ionic/angular";
import {RpsRoutingModule} from "./rps-routing.module";


@NgModule({
  declarations: [RpsComponent],
  imports: [
    CommonModule,
    IonicModule,
    RpsRoutingModule
  ]
})
export class RpsModule {}
