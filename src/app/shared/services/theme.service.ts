// theme.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'darkTheme';
  private isDark = false;

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme() {
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    this.setTheme(
      savedTheme ? savedTheme === 'true' : this.getSystemPreference()
    );
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    this.setTheme(this.isDark);
    localStorage.setItem(this.THEME_KEY, this.isDark.toString());
  }

  private setTheme(isDark: boolean) {
    this.isDark = isDark;
    document.body.classList.toggle('dark-theme', isDark);
  }

  getCurrentTheme(): boolean {
    return this.isDark;
  }

  private getSystemPreference(): boolean {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
