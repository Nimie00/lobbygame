import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule) },
  { path: 'profile', loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule), canActivate: [AuthGuard] },
  { path: 'lobbies', loadChildren: () => import('./lobbies/lobbies.module').then(m => m.LobbiesModule), canActivate: [AuthGuard] },
  { path: 'contact', loadChildren: () => import('./contact/contact.module').then(m => m.ContactModule), canActivate: [AuthGuard] }
];
