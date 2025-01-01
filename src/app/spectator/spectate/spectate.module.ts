import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {MatDialogModule} from "@angular/material/dialog";
import {IonicModule} from "@ionic/angular";
import {SpectateComponent} from "./spectate.component";
import {SpectateRoutingModule} from "./spectate-routing.module";
import {RpsSpectateModule} from "../games/rps/rps-spectate.module";

@NgModule({
  declarations: [SpectateComponent],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    SpectateRoutingModule,
    IonicModule,
    RpsSpectateModule,
  ]
})
export class SpectateModule { }
