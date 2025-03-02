import {AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {DataSet} from "vis-data";
import {Timeline} from "vis-timeline";
import {SpectatorService} from "../../shared/services/spectator.service";
import {SubscriptionTrackerService} from "../../shared/services/subscriptionTracker.service";
import {LanguageService} from "../../shared/services/language.service";
import {Replay} from "../../shared/models/replay";
import {AudioService} from "../../shared/services/audio.service";

@Component({
  selector: 'app-spectate',
  templateUrl: './spectate.component.html',
  styleUrls: ['./spectate.component.scss'],
})
export class SpectateComponent implements OnInit, AfterViewInit, OnDestroy {
  private CATEGORY = "Spectate"
  @ViewChild('visualization', {static: false}) visualizationRef!: ElementRef;
  @Input() events: {
    className: string,
    timestamp: Date,
    action: string,
    player: string
  }[] = [];

  lobbyId: string | null = null;
  game: any;
  playerChoices: { [username: string]: string } = {};
  skipAnimations: boolean = false;
  playingAnimations: boolean = false;
  private timeline: Timeline | any = null;
  private items: DataSet<any> = new DataSet<any>();
  private processedEvents: Set<string> = new Set();
  private timer: any = null;
  private container: any;
  private currentTime: any;
  private startDate: any;
  private endDate: any;
  private showCurrentTime: any;
  private maxEndTime: any;
  private minStartTime: any;
  protected barId = null;
  private isReplayMode: any;
  private alreadyStarted: boolean;
  protected lastEvent: boolean;
  protected disablebuttons: boolean;


  constructor(private route: ActivatedRoute,
              private spectatorService: SpectatorService,
              private tracker: SubscriptionTrackerService,
              private languageService: LanguageService,
              private audioService: AudioService,) {
  }


  async ngOnInit(): Promise<void> {
    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
    this.isReplayMode = this.route.snapshot.url.map(segment => segment.path).join('/').includes('replay');

    if (this.isReplayMode) {
      try {
        const gameState = await this.spectatorService.getGameStateSnapshot(this.lobbyId) as Replay;
        this.processGameState(gameState);
      } catch (error) {
        console.error("Hiba történt a játék állapotának lekérésekor:", error);
      }
    }
  }

  ngAfterViewInit() {
    this.container = document.getElementById('visualization');
    if (!this.container) {
      return;
    }
    if (!this.isReplayMode) {
      const gameSub = this.spectatorService.getGameStateObservable(this.lobbyId).subscribe((gameState) => {
        this.processGameState(gameState);
      });
      this.tracker.add(this.CATEGORY, "getGameAndUserSub", gameSub);
    }
  }

  private processGameState(gameState: Replay): void {
    this.game = gameState;
    if (gameState && gameState.rounds) {
      this.startDate = this.calculateStartDate(gameState);
      this.endDate = this.calculateEndDate(gameState);
      this.showCurrentTime = gameState.winner == null;
      this.isReplayMode = gameState.winner !== null;

      if (!this.currentTime) {
        this.currentTime = new Date(this.startDate.getTime() - 1000);
      }


      this.processTimelineEvents(gameState.rounds, gameState.players, gameState.playerNames);
      if (!this.timeline) {
        this.initializeTimeline();
      }
    } else {
      console.log("Nincs játék vagy nincsenek benne még körök");
    }
  }

  processTimelineEvents(rounds: any, players: string[], playerNames: string[]) {
    const existingIds = new Set();

    Object.keys(rounds).forEach((roundIndex) => {
      const round = rounds[roundIndex];

      Object.keys(round.choices).forEach((playerId) => {
        const choiceData = round.choices[playerId];
        const uniqueId = `${choiceData.timestamp.toMillis()}`;

        if (existingIds.has(uniqueId)) return;
        existingIds.add(uniqueId);

        const playerIndex = players.indexOf(playerId);
        const playerName = (playerIndex !== -1 && playerNames[playerIndex]) ? playerNames[playerIndex] : playerId;
        const eventTime = choiceData.timestamp.toDate();
        const referenceTime = this.currentTime || new Date();
        const isFutureEvent = (eventTime.getTime() - referenceTime.getTime()) > 25;


        const eventConfig = {
          id: uniqueId,
          className: isFutureEvent ? 'default' : `${playerIndex}`,
          actualClassName: `${playerIndex}`,
          start: eventTime,
          content: isFutureEvent ? '???' : `${playerName}: ${this.languageService.translate(choiceData.choice)}`,
          actualContent: `${playerName}: ${choiceData.choice}`,
          contentOut: null,
        };


        if (this.items.get(uniqueId)) {
          this.items.update(eventConfig);
        } else {
          this.items.add(eventConfig);
        }

      });
    });

    this.items = new DataSet(
      [...this.items.get()].sort((a, b) => a.start.getTime() - b.start.getTime())
    );
  }


  async jumpToNextEvent() {
    if (this.lastEvent || this.playingAnimations) {
      return;
    }
    this.stopTimeline();
    const timelineEvents = this.items.get();
    if (timelineEvents.length === 0) {
      console.warn("Nincs feldolgozható esemény");
      return;
    }

    const sortedEvents = [...timelineEvents].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
    const currentTimestamp = this.currentTime.getTime();
    const offset = 500;

    const candidateIndex = sortedEvents.findIndex(
      event => !this.processedEvents.has(event.id) && event.start.getTime() > currentTimestamp
    );

    let nextEventIndex: number;
    if (candidateIndex === -1) {
      nextEventIndex = sortedEvents.length - 1;
    } else {
      nextEventIndex = candidateIndex + 1 < sortedEvents.length ? candidateIndex + 1 : candidateIndex;
    }


    const nextEvent = sortedEvents[nextEventIndex] || null;
    const prevEvent = sortedEvents[nextEventIndex - 1] || null;

    if (prevEvent && !this.processedEvents.has(prevEvent.id)) {
      try {
        const [username, choice] = prevEvent.actualContent.split(': ');
        const updatedChoices = {...this.playerChoices};
        updatedChoices[username] = choice.trim();
        this.playerChoices = updatedChoices;
        this.processedEvents.add(prevEvent.id);
      } catch (error) {
        console.error('Hibás eseményformátum:', prevEvent.actualContent, error);
      }
    }


    let newTime: Date;
    if (prevEvent) {
      if (nextEvent) {
        const timeDiff = nextEvent.start.getTime() - prevEvent.start.getTime();
        if (timeDiff <= offset * 2) {
          newTime = new Date(prevEvent.start.getTime() + timeDiff / 2);
        } else {
          newTime = new Date(nextEvent.start.getTime() - offset);
        }
      } else {
        newTime = new Date(prevEvent.start.getTime() + offset);
      }
    } else {
      newTime = nextEvent ? new Date(nextEvent.start.getTime() - offset) : this.currentTime;
    }

    this.currentTime = newTime;
    this.setBarTime(this.currentTime);

    timelineEvents.forEach((item: any) => {
      if (new Date(item.start).getTime() <= this.currentTime.getTime()) {
        const parts = item.actualContent.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const valueToTranslate = parts.slice(1).join(':').trim();
          const translatedText = this.languageService.translate(valueToTranslate);
          item.content = `${key}: ${translatedText}`;
        } else {
          item.content = item.actualContent;
        }
        item.className = item.actualClassName;
        this.items.update(item);
        this.processedEvents.add(item.id);
      }
    });

    const lastItem = timelineEvents[timelineEvents.length - 1];
    this.lastEvent = nextEvent && nextEvent.id === lastItem.id;
    this.disablebuttons = true;
    await this.delay(100);
    this.disablebuttons = false;
  }


  async jumpToRealTime() {
    if (this.playingAnimations) {
      return;
    }
    this.stopTimeline();
    if (this.barId) {
      this.timeline.removeCustomTime(this.barId);
    }
    this.barId = null;
    this.currentTime = new Date(this.startDate);
    await this.processEventsToRealTime();
    this.startTimeline(true);
  }

  private async processEventsToRealTime() {
    const originalplayingAnimations = this.playingAnimations;
    const originalskipAnimations = this.skipAnimations;
    this.skipAnimations = true;

    const startTime = this.startDate.getTime();
    const realTime = Date.now();

    const eventsToProcess = this.items.get({
      filter: (item) => {
        const eventTime = new Date(item.start).getTime();
        return eventTime > startTime && eventTime <= realTime;
      }
    });

    for (const event of eventsToProcess) {
      if (!this.processedEvents.has(String(new Date(event.start).getTime()))) {

        await this.delay(50);
        event.content = event.actualContent || event.content;

        const [username, choice] = event.content.split(':');
        const updatedChoices = {...this.playerChoices};
        updatedChoices[username.trim()] = choice.trim();
        this.playerChoices = updatedChoices;

        event.content = this.languageService.translate(event.content);
        this.items.update(event);

        this.processedEvents.add(String(new Date(event.start).getTime()));
      }
    }
    //Azért kell ide, hogy az animáció a legutolsó körbe ne játszódjon le.
    await this.delay(50);
    this.playingAnimations = originalplayingAnimations;
    this.skipAnimations = originalskipAnimations;
    this.timeline.redraw();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  initializeTimeline() {
    this.maxEndTime = this.isReplayMode
      ? new Date(this.endDate.getTime() + (30 * 60 * 1000))
      : new Date(Date.now() + (30 * 60 * 1000));
    this.minStartTime = new Date(this.startDate.getTime() - (30 * 60 * 1000));

    const options = {
      start: new Date(this.startDate.getTime() - 1500),
      end: new Date(this.endDate.getTime() + 1500),
      editable: false,
      stack: false,
      max: this.maxEndTime,
      min: this.minStartTime,
      orientation: 'bottom',
      locale: this.languageService.getCurrentLang(),
      verticalScroll: true,
      showCurrentTime: false,
    };

    this.timeline = new Timeline(this.container, this.items, options);
    this.timeline.redraw();


    if (this.showCurrentTime) {
      this.jumpToRealTime().then(() => {
      });
    }
  }

  startTimeline(realtime: boolean) {
    if (this.timer || this.playingAnimations) {
      return;
    }

    if (!this.currentTime) {
      this.currentTime = realtime ? new Date(Date.now() - 1000) : new Date(this.startDate);
    }

    const sortedItems = [...this.items.get()].sort((a, b) => a.start.getTime() - b.start.getTime());

    this.timer = setInterval(() => {
      if (this.barId == null) {
        this.currentTime = realtime ? new Date(Date.now() - 1000) : new Date(this.startDate);
      } else {

        const nextEvent = sortedItems.find(event => event.start > this.currentTime);
        if (nextEvent) {
          const timeDifference = nextEvent.start.getTime() - this.currentTime.getTime();
          if (timeDifference <= 25) {
            this.currentTime = new Date(this.currentTime.getTime() + timeDifference);
          } else {
            this.currentTime = new Date(this.currentTime.getTime() + 25);
          }
        } else {
          this.currentTime = new Date(this.currentTime.getTime() + 25);
        }
      }

      if (this.currentTime > this.maxEndTime) {
        this.maxEndTime = new Date(this.currentTime.getTime() + 1000);
        this.timeline.setOptions({max: this.maxEndTime});
      }

      this.setBarTime(this.currentTime);
      this.alreadyStarted = true;

      this.items.get().forEach((item: any) => {
        const eventTime = new Date(item.start).getTime();
        const current = this.currentTime.getTime();


        if (eventTime <= current) {
          item.contentOut = item.actualContent;
          item.className = item.actualClassName;

          const parts = item.actualContent.split(':');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const valueToTranslate = parts[1].trim();
            const translatedText = this.languageService.translate(valueToTranslate);
            item.content = `${key}: ${translatedText}`;
          }

          this.items.update(item);
        }
      });

      const eventsAtCurrentTime = this.items.get({
        filter: (item) => {
          const itemTime = new Date(item.start).getTime();
          const diff = Math.abs(itemTime - this.currentTime.getTime());
          return diff <= 25;
        },
      });

      eventsAtCurrentTime.forEach((event: any) => {
        if (!this.processedEvents.has(String(new Date(event.start).getTime()))) {
          const [username, choice] = (event.actualContent || event.content).split(': ');
          const updatedChoices = {...this.playerChoices};
          updatedChoices[username.trim()] = choice.trim();
          this.playerChoices = updatedChoices;
          this.processedEvents.add(String(new Date(event.start).getTime()));
        }
      });
    }, 25);

  }

  setBarTime(time: Date) {
    if (this.barId == null) {
      this.barId = this.timeline.addCustomTime(time, "customBar");
    } else {
      this.timeline.setCustomTime(time, "customBar");
    }
  }

  jumpToFirstEvent() {
    if (this.playingAnimations) {
      return;
    }
    this.playerChoices = {};
    this.alreadyStarted = false;
    this.lastEvent = false;
    if (this.items.get().length > 0) {
      this.processedEvents.clear();
      const sortedEvents = [...this.items.get()].sort((a, b) => a.start.getTime() - b.start.getTime());
      this.currentTime = new Date(new Date(sortedEvents[0].start.getTime() - 1000).getTime() - 1000);
      this.setBarTime(this.currentTime)
      this.stopTimeline();
    } else {
      console.warn("Nincs event")
    }
  }

  jumpToStart() {
    if (this.playingAnimations) {
      return;
    }
    this.playerChoices = {};
    this.playingAnimations = false;
    this.alreadyStarted = false;
    this.processedEvents.clear();
    this.lastEvent = false;
    this.currentTime = new Date(this.startDate.getTime());
    this.setBarTime(this.currentTime)
    this.stopTimeline();
  }

  stopTimeline() {
    if (this.playingAnimations) {
      return;
    }
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = null;
  }

  ngOnDestroy(): void {
    this.audioService.stopAllSounds();
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  playingAnimation(event: boolean) {
    this.playingAnimations = event;
  }

  calculateStartDate(gameState: any): Date {
    return gameState.startedAt instanceof Date
      ? gameState.startedAt
      : gameState.startedAt.toDate();
  }

  calculateEndDate(gameState: any): Date {
    if (gameState.winner !== null && gameState.endedAt !== null) {
      return (gameState.endedAt instanceof Date)
        ? gameState.endedAt
        : gameState.endedAt.toDate();
    } else {
      if (gameState.rounds && Object.keys(gameState.rounds).length > 0) {
        const latestRoundTimestamp = Object.values(gameState.rounds)
          .flatMap((round: any) => Object.values(round.choices).map((choice: any) => choice.timestamp.toMillis()))
          .reduce((latest, current) => Math.max(latest, current), 0);

        if (latestRoundTimestamp > 0) {
          return new Date(latestRoundTimestamp);
        } else {
          return new Date(Date.now() + (2 * 60 * 1000));
        }
      } else {
        return new Date(Date.now() + (2 * 60 * 1000));
      }
    }
  }


}
