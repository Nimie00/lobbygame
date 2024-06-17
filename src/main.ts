import {bootstrapApplication, BrowserModule} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AppComponent } from './app/app.component';
import { firebaseConfig } from './app/environments/environments';
import { routes } from './app/app-routing.module';
import { FormsModule } from "@angular/forms";
import { provideAnimations } from '@angular/platform-browser/animations';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(BrowserModule, AngularFireModule.initializeApp(firebaseConfig), AngularFireAuthModule, FormsModule),
    provideAnimations()
]
})
  .catch(err => console.error(err));
