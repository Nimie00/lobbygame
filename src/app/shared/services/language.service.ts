import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, catchError, finalize, tap} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translations: any = {};
  private translationLoadPromises: { [lang: string]: Promise<void> } = {};
  private translationReloadAttempted: { [lang: string]: boolean } = {};
  private currentLanguage = new BehaviorSubject<string>('en');
  private translationsLoaded = new BehaviorSubject<boolean>(false);
  private readonly baseUrl = '../../../assets/i18n';
  private readonly STORAGE_KEY_LANG = 'selectedLanguage';
  private readonly STORAGE_KEY_TRANSLATIONS = 'cachedTranslations';

  constructor(private http: HttpClient) {
  }

  init(): Promise<void> {
    const savedLang = localStorage.getItem(this.STORAGE_KEY_LANG);
    const savedTranslations = this.loadFromStorage();

    if (savedLang && savedTranslations && savedTranslations[savedLang]) {
      this.translations = savedTranslations;
      this.currentLanguage.next(savedLang);
      this.translationsLoaded.next(true);
      return Promise.resolve();
    }

    const defaultLang = savedLang || 'en';
    return this.loadTranslations(defaultLang);
  }

  private loadFromStorage(): any {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY_TRANSLATIONS);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading translations from storage:', error);
      return null;
    }
  }

  private saveToStorage(lang: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_LANG, lang);
      localStorage.setItem(this.STORAGE_KEY_TRANSLATIONS, JSON.stringify(this.translations));
    } catch (error) {
      console.error('Error saving translations to storage:', error);
    }
  }

  async loadTranslations(lang: string): Promise<void> {
    const url = `${this.baseUrl}/${lang}.json`;

    if (this.translations[lang]) {
      this.currentLanguage.next(lang);
      this.translationsLoaded.next(true);
      this.saveToStorage(lang);
      this.translationLoadPromises[lang] = Promise.resolve();
      return;
    }

    if (this.translationLoadPromises[lang]) {
      return this.translationLoadPromises[lang];
    }

    this.translationLoadPromises[lang] = new Promise((resolve, reject) => {
      this.http.get<Record<string, any>>(url).pipe(
        tap(data => {
          this.translations[lang] = data;
          this.currentLanguage.next(lang);
          this.saveToStorage(lang);
        }),
        catchError(error => {
          console.error('Error loading translations:', error);
          reject(error);
          return [];
        }),
        finalize(() => {
          this.translationsLoaded.next(true);
        })
      ).subscribe({
        next: () => {
          resolve();
        },
        error: (error) => {
          console.error('Failed to load translations:', error);
          reject(error);
        }
      });
    });

    return this.translationLoadPromises[lang];
  }

  translate(key: string): string {
    const currentLang = this.currentLanguage.value;

    if (this.translations[currentLang] && this.translations[currentLang][key]) {
      return this.translations[currentLang][key];
    } else {
      if (!this.translationReloadAttempted[currentLang] && false) {
        this.translationReloadAttempted[currentLang] = true;
        this.clearCache();
        this.loadTranslations(currentLang);
      }
      // Ha nincs fordítás, visszaadjuk a kulcsot
      return key;
    }
  }


  getCurrentLanguageObservable() {
    return this.currentLanguage.asObservable();
  }

  getCurrentLang(){
    return this.currentLanguage.value;
  }


  clearCache(): void {
    localStorage.removeItem(this.STORAGE_KEY_LANG);
    localStorage.removeItem(this.STORAGE_KEY_TRANSLATIONS);
    this.translations = {};
    this.translationsLoaded.next(false);
  }
}
