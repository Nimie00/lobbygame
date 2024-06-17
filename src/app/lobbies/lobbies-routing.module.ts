import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LobbiesComponent } from './lobbies.component';

const routes: Routes = [{ path: '', component: LobbiesComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LobbiesRoutingModule { }
