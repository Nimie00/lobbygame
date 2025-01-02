import { IonicModule } from '@ionic/angular';
import {APP_INITIALIZER, NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { firebaseConfig } from '../environments/environments';
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { MatDialogModule } from "@angular/material/dialog";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {AngularFirestoreModule} from "@angular/fire/compat/firestore";
import {CommonModule, NgOptimizedImage} from "@angular/common";
import {HttpClientModule} from "@angular/common/http";
import {AppComponent} from "./app.component";
import {LanguagePipe} from "./shared/pipes/language";
import {LanguageService} from "./shared/services/language.service";
import {ContactComponent} from "./pages/contact/contact.component";
import {LoginComponent} from "./pages/login/login.component";
import {RpsComponent} from "./pages/games/rps/rps.component";
import {CreateLobbyModalComponent} from "./pages/lobbies/create-lobby-modal/create-lobby-modal.component";
import {LobbyComponent} from "./pages/lobbies/lobby/lobby.component";
import {LobbiesComponent} from "./pages/lobbies/lobbies.component";
import {ProfileComponent} from "./pages/profile/profile.component";
import {RpsSpectateComponent} from "./pages/spectator/games/rps/rps-spectate.component";
import {SpectateComponent} from "./pages/spectator/spectate/spectate.component";
import {
  LobbyPlayersManagingComponent
} from "./pages/lobbies/lobby-players-managing-modal/lobby-players-managing.component";
import {RouterModule, Routes} from "@angular/router";
import {AuthGuard} from "./shared/guards/auth.guard";
import {SettingsComponent} from "./pages/settings-component/settings.component";

export function initializeLanguage(languageService: LanguageService) {
  return () => languageService.init();
}

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    component: LoginComponent,
  },

  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'lobbies',
    component: LobbiesComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'contact',
    component: ContactComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'game/:lobbyId',
    component: RpsComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'lobbies/:lobbyId',
    component: LobbiesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'spectate/:lobbyId',
    component: SpectateComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'settings',
    component: SettingsComponent,
  },
  {
    path: '**',
    redirectTo: '/profile'
  }

];


@NgModule({
  declarations: [
    AppComponent ,
    LanguagePipe,
    ContactComponent,
    LoginComponent,
    RpsComponent,
    CreateLobbyModalComponent,
    LobbyComponent,
    LobbiesComponent,
    ProfileComponent,
    RpsSpectateComponent,
    SpectateComponent,
    LobbyPlayersManagingComponent,
    SettingsComponent,
  ],
  imports: [
    BrowserModule,
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFireAuthModule,
    BrowserAnimationsModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    AngularFirestoreModule,
    CommonModule,
    HttpClientModule,

    NgOptimizedImage,
    IonicModule.forRoot(),
    RouterModule.forRoot(routes),
  ],
  exports: [
    LanguagePipe
  ],
  bootstrap: [AppComponent],
  providers: [
    LanguageService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeLanguage,
      deps: [LanguageService],
      multi: true
    }]
})
export class AppModule { }

