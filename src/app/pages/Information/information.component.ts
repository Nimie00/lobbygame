import {Component, OnDestroy, OnInit} from '@angular/core';
import {LanguageService} from "../../shared/services/language.service";
import {ThemeService} from "../../shared/services/theme.service";
import {AudioService} from "../../shared/services/audio.service";

interface Topic {
  title: string;
  description: string;
}

@Component({
  selector: 'app-information',
  templateUrl: './information.component.html',
  styleUrls: ['./information.component.scss']
})
export class InformationComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  filteredTopics: Topic[] = [];
  selectedTopic: Topic | null = null;


  topics: Topic[] = [
    {
      title: 'Főoldal',
      description: 'Ebben az oldalon található a játék főmenüje, ahol be lehet jelentkezni, regisztrálni, és elérhetőek a játékmódok.'
    },
    {
      title: 'Játékmechanikák',
      description: 'Itt találhatók a játékban használt alapvető mechanikák leírása, mint például a kő-papír-olló játékmenet, pontozási rendszer, stb.'
    },
    {
      title: 'Karakterek és statisztikák',
      description: 'Ezen az oldalon olvashatók a karakterek tulajdonságai, fejlődési lehetőségei és statisztikái.'
    },
    {
      title: 'Beállítások',
      description: 'Itt lehet testreszabni a játék hangbeállításait, grafikát, valamint egyéb opciókat.'
    }

  ];


  constructor(private themeService: ThemeService,
              private languageService: LanguageService,
              private audioService: AudioService,) {
  }


  ngOnDestroy(): void {
    this.audioService.stopAllSounds()
  }

  ngOnInit(): void {
    if (localStorage.getItem('infoOpened') !== 'true') {
      localStorage.setItem('infoOpened', 'true');
    }
    this.filteredTopics = this.topics;
  }

  filterTopics() {
    if (!this.searchTerm) {
      this.filteredTopics = this.topics;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredTopics = this.topics.filter(topic =>
      topic.title.toLowerCase().includes(term) ||
      topic.description.toLowerCase().includes(term)
    );
  }

  selectTopic(topic: Topic) {
    this.selectedTopic = topic;
  }
}
