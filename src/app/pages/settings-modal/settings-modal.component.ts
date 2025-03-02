import {Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {LanguageService} from "../../shared/services/language.service";
import {ThemeService} from "../../shared/services/theme.service";
import {IonModal} from "@ionic/angular";
import {AudioService} from "../../shared/services/audio.service";

@Component({
  selector: 'app-settings-modal',
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.scss'],
})
export class SettingsModalComponent implements OnInit, OnDestroy {
  currentLanguage: string;
  @Output() closeModal = new EventEmitter<void>();
  @ViewChild('settingsModal') modal: IonModal;
  volume: number = 50;

  constructor(private languageService: LanguageService,
              public themeService: ThemeService,
              private audioService: AudioService,
  ) {
  }

  async ngOnInit() {
    const langSub = this.languageService.getCurrentLanguageObservable().subscribe((language) => {
      this.currentLanguage = language;
    });

    langSub.unsubscribe();

    setTimeout(async () => {
      if (this.modal) {
        await this.modal.present();

      } else {
        console.error('Modal not initialized');
      }
    });
  }


  changeLanguage(lang: string): void {
    this.languageService.clearCache();
    this.currentLanguage = lang;
    this.languageService.loadTranslations(lang).then();
  }


  toggleDarkMode() {
    this.themeService.toggleTheme();
  }

  close() {
    if (this.modal) {
      this.closeModal.emit();
      this.modal.dismiss().then();
    }
  }

  ngOnDestroy() {
    this.close();
  }

  updateVolume(event: any): void {
    const newVolume = event.detail.value / 100; // átalakítás 0-1 skálára
    this.audioService.setVolume(newVolume);
  }

  playRandomSound(): void {
    this.audioService.playRandomSound();
  }
}
