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
      title: 'LOGIN_PAGE',
      description: 'LOGIN_DESCRIPTION'
    },
    {
      title: 'PROFILE_PAGE',
      description: 'PROFILE_PAGE_DESCRIPTION'
    },
    {
      title: 'PROFILE_SETTINGS',
      description: 'PROFILE_SETTINGS_DESCRIPTION'
    },
    {
      title: 'PROFILE_STATISTICS',
      description: 'PROFILE_STATISTICS_DESCRIPTION'
    },
    {
      title: 'CONTACT_PAGE',
      description: 'CONTACT_PAGE_DESCRIPTION'
    },
    {
      title: 'INFORMATION_PAGE',
      description: 'INFORMATION_PAGE_DESCRIPTION'
    },
    {
      title: 'LOBBIES_PAGE',
      description: 'LOBBIES_PAGE_DESCRIPTION'
    },
    {
      title: 'LOBBIES_PAGE_CREATE_LOBBY',
      description: 'LOBBIES_PAGE_CREATE_LOBBY_DESCRIPTION'
    },
    {
      title: 'LOBBIES_PAGE_PLAYER_MANAGE',
      description: 'LOBBIES_PAGE_PLAYER_MANAGE_DESCRIPTION'
    },
    {
      title: 'LOBBIES_PAGE_LOBBY',
      description: 'LOBBIES_PAGE_LOBBY_DESCRIPTION'
    },
    {
      title: 'GAME_PAGE',
      description: 'GAME_PAGE_DESCRIPTION'
    },
    {
      title: 'RPS_PAGE',
      description: 'RPS_PAGE_DESCRIPTION'
    },
    {
      title: 'SPECTATE_PAGE',
      description: 'SPECTATE_PAGE_DESCRIPTION'
    },
    {
      title: 'SETTINGS_MENU',
      description: 'SETTINGS_MENU_DESCRIPTION'
    },

  ];


  ngOnInit(): void {
    if (localStorage.getItem('infoOpened') !== 'true') {
      setTimeout(() => {
        localStorage.setItem('infoOpened', 'true');
      });
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

  constructor(private themeService: ThemeService,
              private languageService: LanguageService,
              private audioService: AudioService,) {
  }


  ngOnDestroy(): void {
    this.audioService.stopAllSounds()
  }
}
