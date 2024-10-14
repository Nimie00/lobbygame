import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {RpsComponent} from "./rps.component";

const routes: Routes = [{ path: '', component: RpsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RpsRoutingModule { }
