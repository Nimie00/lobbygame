import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";


@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private volume: number = 0;
  private soundEffects: string[] = [];
  private activeAudios: HTMLAudioElement[] = [];

  constructor(private http: HttpClient) {
    this.loadSoundEffects();
  }

  private loadSoundEffects(): void {
    this.http.get<{ files: string[] }>('assets/sfx/sfx-files.json')
      .subscribe(response => {
        this.soundEffects = response.files.map(file => `assets/sfx/${file}`);
      });
  }

  setVolume(volume: number): void {
    this.volume = volume;
  }

  getVolume(): number {
    return this.volume;
  }

  playSoundFromUrl(url: string): void {
    const audio = new Audio(url);
    audio.volume = this.volume;
    audio.addEventListener('ended', () => {
      this.activeAudios = this.activeAudios.filter(a => a !== audio);
    });
    this.activeAudios.push(audio);
    audio.play();
  }


  playRandomSound(): void {
    if (this.soundEffects.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.soundEffects.length);
      const soundUrl = this.soundEffects[randomIndex];
      this.playSoundFromUrl(soundUrl);
    }
  }

  playSoundByName(effectName: string): void {
    const soundUrl = this.soundEffects.find(url => url.endsWith(effectName));

    if (soundUrl) {
      this.playSoundFromUrl(soundUrl);
    } else {
      console.error(`A "${effectName}" nevű hangeffekt nem található a soundEffects tömbben.`);
    }
  }

  stopAllSounds(): void {
    this.activeAudios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.activeAudios = [];
  }
}
