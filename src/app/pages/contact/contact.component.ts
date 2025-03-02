import {Component, OnDestroy, OnInit} from '@angular/core';
import {LanguageService} from "../../shared/services/language.service";
import {AudioService} from "../../shared/services/audio.service";

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent implements OnInit, OnDestroy {
  constructor(private languageService: LanguageService,
              private audioService : AudioService,) {


  }

  ngOnDestroy(): void {
        this.audioService.stopAllSounds()
    }

  ngOnInit(): void {
    }
}
