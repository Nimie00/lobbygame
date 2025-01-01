import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {SpectateComponent} from './spectate.component';

const routes: Routes = [{ path: '', component: SpectateComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SpectateRoutingModule {}
