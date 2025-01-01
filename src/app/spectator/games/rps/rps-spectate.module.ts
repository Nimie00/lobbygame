import {NgModule} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {RpsSpectateComponent} from './rps-spectate.component';
import {IonicModule} from "@ionic/angular";
import {RpsSpectateRoutingModule} from "./rps-spectate-routing.module";
import {FormsModule} from "@angular/forms";


@NgModule({
  declarations: [RpsSpectateComponent],
  exports: [
    RpsSpectateComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RpsSpectateRoutingModule,
    NgOptimizedImage,
    FormsModule
  ]
})
export class RpsSpectateModule {}
