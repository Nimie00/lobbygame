import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {RpsSpectateComponent} from "./rps-spectate.component";

const routes: Routes = [{ path: '', component: RpsSpectateComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RpsSpectateRoutingModule { }
