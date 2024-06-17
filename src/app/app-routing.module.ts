import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '',
    redirectTo: '/login',
    pathMatch: 'full' },

  { path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginModule) },

  { path: 'profile',
    loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule),},

  { path: 'lobbies',
    loadChildren: () => import('./lobbies/lobbies.module').then(m => m.LobbiesModule),},

  { path: 'contact',
    loadChildren: () => import('./contact/contact.module').then(m => m.ContactModule),},

  { path: 'dialog',
    loadChildren: () => import('./lobby-dialog/create-lobby-dialog.module').then(m => m.CreateLobbyDialogModule),
    canActivate: [AuthGuard] },

  { path: '**',
    redirectTo: '/profile' }];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
