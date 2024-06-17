import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateLobbyDialogComponent } from './create-lobby-dialog.component';

const routes: Routes = [{ path: '', component: CreateLobbyDialogComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CreateLobbyDialogRoutingModule { }
