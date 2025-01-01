import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AuthGuard} from "./guards/auth.guard";

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginModule)
  },

  {
    path: 'profile',
    loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule),
    canActivate: [AuthGuard]
  },

  {
    path: 'lobbies',
    loadChildren: () => import('./lobbies/lobbies.module').then(m => m.LobbiesModule),
    canActivate: [AuthGuard]
  },

  {
    path: 'contact',
    loadChildren: () => import('./contact/contact.module').then(m => m.ContactModule),
    canActivate: [AuthGuard]
  },

  {
    path: 'game/:lobbyId',
    loadChildren: () => import('./games/rps/rps.module').then(m => m.RpsModule),
    canActivate: [AuthGuard]
  },

  {
    path: 'lobbies/:lobbyId',
    loadChildren: () => import('./lobbies/lobbies.module').then(m => m.LobbiesModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'spectate/:lobbyId',
    loadChildren: () => import('./spectator/spectate/spectate.module').then(m => m.SpectateModule),
    canActivate: [AuthGuard]
  },

  {
    path: '**',
    redirectTo: '/profile'
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
