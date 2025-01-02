import {Component, OnInit} from '@angular/core';
import {LanguageService} from "../../shared/services/language.service";

@Component({
  selector: 'app-settings-component',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  currentLanguage: any;
  isDarkMode: any;

  constructor(private languageService: LanguageService) {
  }

  ngOnInit() {
  }

  changeLanguage(lang: string): void {
    this.languageService.clearCache();
    this.currentLanguage = lang;
    this.languageService.loadTranslations(lang);
  }

  dismiss(){

  }


  toggleDarkMode() {

  }
}
