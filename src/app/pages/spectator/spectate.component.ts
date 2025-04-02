import {AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {DataSet} from "vis-data";
import {Timeline} from "vis-timeline";
import {SpectatorService} from "../../shared/services/spectator.service";
import {SubscriptionTrackerService} from "../../shared/services/subscriptionTracker.service";
import {LanguageService} from "../../shared/services/language.service";
import {Replay} from "../../shared/models/replay";
import {AudioService} from "../../shared/services/audio.service";
import {take} from "rxjs";
import {User} from "../../shared/models/user.model";
import {AuthService} from "../../shared/services/auth.service";
import {CardPlayer} from "../../shared/models/games/cardPlayer";

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

  private lobbyId: string | null = null;
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
  private stoppedBecausePlayingAnimation: boolean = false;
  private isReplayMode: any;
  protected lastEvent: boolean;
  protected disablebuttons: boolean;
  protected barId = null;
  protected game: any;
  protected playerChoices: { [username: string]: string } = {};
  protected skipAnimations: boolean = false;
  protected playingAnimations: boolean = false;
  protected beforeFirstEvent: boolean = true;
  protected currentUser: User;
  protected cardPlayers: CardPlayer[];
  private preprocessedItems: Array<{timestamp: number; data: any, processed: boolean}> = [];
  private nextEventIndex = 0;
  private translationCache = new Map<string, string>();
  private liveUpdateQueue: any[] = [];
  private lastItemCount = 0;
  private realtimeMode: boolean;


  constructor(private route: ActivatedRoute,
              private spectatorService: SpectatorService,
              private tracker: SubscriptionTrackerService,
              private languageService: LanguageService,
              private audioService: AudioService,
              private authService: AuthService,) {
  }


  async ngOnInit() {
    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
    this.isReplayMode = this.route.snapshot.url.map(segment => segment.path).join('/').includes('replay');

    this.authService.getUserData().pipe(
      take(1)
    ).subscribe(user => {
      this.currentUser = user;
    });


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

    if (!this.timer) {
      this.beforeFirstEvent = true;
    }

  }

  ngOnDestroy(): void {
    this.audioService.stopAllSounds();
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  playingAnimation(event: boolean) {
    this.stoppedBecausePlayingAnimation = true;
    this.playingAnimations = event;
    if (!this.skipAnimations) {
      event ? this.stopTimeline() : this.startTimeline(false)
    }
  }

  protected startTimeline(realtime: boolean) {
    if (this.timer || (this.playingAnimations && !this.stoppedBecausePlayingAnimation)) {
      return;
    }

    if(!this.timeline){
      this.initializeTimeline();
    }


    if (this.preprocessedItems.length === 0) {
      this.preprocessItems();
    }

    this.timer = setInterval(() => this.processTimelineFrame(realtime && this.game.status!=='ended'), 25);
  }

  private preprocessItems(force = false) {
    const currentItems = this.items.get();

    if (this.realtimeMode || force || currentItems.length !== this.lastItemCount) {
      this.preprocessedItems = currentItems
        .map(item => this.createPreprocessedItem(item))
        .sort((a, b) => a.timestamp - b.timestamp);

      this.lastItemCount = currentItems.length;
      this.nextEventIndex = 0;
    }
  }

  private createPreprocessedItem(item: any) {
    return {
      timestamp: new Date(item.start).getTime(),
      processed: false,
      data: {
        ...item,
        translatedContent: this.cacheTranslation(item.actualContent),
        actualClassName: item.actualClassName
      }
    };
  }



  private processTimelineFrame(realtime: boolean) {
    this.realtimeMode = realtime && this.game.status!=='ended'; // Frissítjük az állapotot

    if (this.realtimeMode) {
      this.handleLiveUpdates();
      this.preprocessItems(true); // Kényszerítjük az újraellenőrzést
    }
    if (this.barId == null) {
      this.handleRealtimeUpdate(realtime);
    } else {
      this.advanceSimulatedTime();
    }

    this.updateTimelineState();
    this.processPastEvents();
    this.processCurrentEvents();
  }

  private handleRealtimeUpdate(realtime: boolean) {
    const now = Date.now();
    this.currentTime.setTime(realtime ? now - 1000 : this.currentTime.getTime() + 25);
  }

  private advanceSimulatedTime() {
    const currentTimestamp = this.currentTime.getTime();
    const nextEvent = this.findNextEvent(currentTimestamp);

    if (nextEvent) {
      const timeDiff = nextEvent.timestamp - currentTimestamp;
      this.currentTime.setTime(currentTimestamp + Math.min(timeDiff, 25));
    } else {
      this.currentTime.setTime(currentTimestamp + 25);
    }
  }

  private handleLiveUpdates() {
      if (!this.realtimeMode) return;

      // 1. Új elemek keresése
      const newItems = this.items.get()
        .filter(item => !this.preprocessedItems.some(pi => pi.data.id === item.id));

      // 2. Új elemek hozzáadása a queue-hoz
      if (newItems.length > 0) {
        this.liveUpdateQueue.push(...newItems.map(item => this.createPreprocessedItem(item)));
      }

      // 3. Rendezés és egyesítés optimális módon
      if (this.liveUpdateQueue.length > 0) {
        this.preprocessedItems = this.mergeSortedArrays(
          this.preprocessedItems,
          this.liveUpdateQueue.sort((a, b) => a.timestamp - b.timestamp)
        );
        this.liveUpdateQueue = [];
      }
    }

  private mergeSortedArrays(mainArray: any[], newItems: any[]) {
      let mainIndex = 0;
      let newIndex = 0;
      const result = [];

      while (mainIndex < mainArray.length && newIndex < newItems.length) {
        if (mainArray[mainIndex].timestamp < newItems[newIndex].timestamp) {
          result.push(mainArray[mainIndex++]);
        } else {
          result.push(newItems[newIndex++]);
        }
      }

      return result.concat(
        mainArray.slice(mainIndex),
        newItems.slice(newIndex)
      );
    }


  private findNextEvent(currentTimestamp: number) {
    while (this.nextEventIndex < this.preprocessedItems.length) {
      const event = this.preprocessedItems[this.nextEventIndex];
      if (event.timestamp > currentTimestamp) {
        return event;
      }
      this.nextEventIndex++;
    }
    return null;
  }

  private updateTimelineState() {
    const currentTimestamp = this.currentTime.getTime();

    if (currentTimestamp > this.maxEndTime.getTime() - 1000) {
      this.maxEndTime.setTime(currentTimestamp + 1000);
      this.timeline.setOptions({max: this.maxEndTime});
    }

    this.setBarTime(this.currentTime);
  }

  private processPastEvents() {
    const currentTimestamp = this.currentTime.getTime();

    for (let i = 0; i < this.preprocessedItems.length; i++) {
      const item = this.preprocessedItems[i];

      if (item.timestamp > currentTimestamp) break;

      if (!item.processed) {
        item.processed = true;
        item.data.classNameUpdated = true;

        this.items.update({
          ...item.data,
          className: item.data.actualClassName,
          content: item.data.translatedContent
        });
      }
    }
  }
  private processCurrentEvents() {
    const currentTimestamp = this.currentTime.getTime();
    const timeWindow = 25;

    const startIdx = this.findEventIndex(currentTimestamp - timeWindow);
    const endIdx = this.findEventIndex(currentTimestamp + timeWindow);

    for (let i = startIdx; i <= endIdx; i++) {
      const event = this.preprocessedItems[i];
      if (this.preprocessedItems[i] && Math.abs(event.timestamp - currentTimestamp) <= timeWindow) {
        this.handleEventTrigger(event);
      }
    }
  }

  private findEventIndex(targetTimestamp: number) {
    let low = 0, high = this.preprocessedItems.length - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const midVal = this.preprocessedItems[mid].timestamp;

      if (midVal < targetTimestamp) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return low;
  }

  private handleEventTrigger(event: typeof this.preprocessedItems[0]) {
    if (!this.processedEvents.has(String(event.timestamp))) {
      const [username, choice] = event.data.actualContent.split(': ');
      this.playerChoices = {
        ...this.playerChoices,
        [username.trim()]: choice.trim()
      };

      this.processedEvents.add(String(event.timestamp));
      this.beforeFirstEvent = false;
    }
  }

  private cacheTranslation(content: string) {
    if (!content) return '';

    const [key, value] = content.split(':').map(p => p.trim());
    const normalizedValue = value.replace(/_/g, ' ');

    if (!this.translationCache.has(normalizedValue)) {
      this.translationCache.set(normalizedValue, this.languageService.translate(normalizedValue));
    }

    return `${key}: ${this.translationCache.get(normalizedValue)}`;
  }

  protected stopTimeline() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = null;
  }

  protected jumpToFirstEvent() {
    if (this.playingAnimations) {
      return;
    }
    this.playerChoices = {};
    this.playingAnimations = false;
    this.processedEvents.clear();
    this.lastEvent = false;
    this.beforeFirstEvent = true;

    if (this.items.get().length > 0) {
      const sortedEvents = [...this.items.get()].sort((a, b) => a.start.getTime() - b.start.getTime());

      this.currentTime = new Date(new Date(sortedEvents[0].start.getTime() - 1000).getTime() - 1000);
      this.setBarTime(this.currentTime)
      this.stopTimeline();
    } else {
      console.warn("Nincs event")
    }
  }

  protected jumpToStart() {
    if (this.playingAnimations) {
      return;
    }
    this.playerChoices = {};
    this.playingAnimations = false;
    this.processedEvents.clear();
    this.lastEvent = false;
    this.beforeFirstEvent = true;

    this.currentTime = new Date(this.startDate.getTime());
    this.setBarTime(this.currentTime)
    this.stopTimeline();

  }

  protected async jumpToNextEvent() {
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

    if(this.processedEvents.size > 0){
      this.beforeFirstEvent = false;
    }
  }

  protected async jumpToRealTime() {
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

  private processGameState(gameState: Replay): void {
    this.game = gameState;
    if (gameState && gameState.rounds) {


      if(this.game.gameType === "CARD"){
        this.cardPlayers = this.game.players.map((id: string | number, index: string | number) => ({
          id:id,
          name: this.game!.playerNames[index],
          cards: this.game!.hands[id] || []
        }));
      }
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
      } else {
        this.timeline.setItems(this.items);
        this.timeline.redraw();
      }
    } else {
      console.log("Nincs játék vagy nincsenek benne még körök");
    }
  }

  private processTimelineEvents(rounds: any, players: string[], playerNames: string[]) {
    const existingIds = new Set();

    Object.keys(rounds).forEach((roundIndex) => {
      const round = rounds[roundIndex];

      Object.keys(round.choices).forEach((playerId) => {
        const choiceData = round.choices[playerId];

        const uniqueId = `${choiceData.timestamp.toMillis()}-${roundIndex}`;

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
        };


        if (this.items.get(uniqueId)) {
          this.items.update(eventConfig);
        } else {
          this.items.add(eventConfig);
        }

      });
    });

    this.items = new DataSet(
      [...this.items.get()].sort((a, b) => {
        const aRoundIndex = parseInt(a.id.split('-')[1], 10);
        const bRoundIndex = parseInt(b.id.split('-')[1], 10);
        if (aRoundIndex !== bRoundIndex) {
          return aRoundIndex - bRoundIndex;
        }
        return a.start.getTime() - b.start.getTime();
      })
    );
  }

  private initializeTimeline() {
    this.maxEndTime = this.isReplayMode
      ? new Date(this.endDate.getTime() + (30 * 60 * 1000))
      : new Date(Date.now() + (30 * 60 * 1000));
    this.minStartTime = new Date(this.startDate.getTime() - (30 * 60 * 1000));

    this.processedEvents.clear();
    this.nextEventIndex = 0;

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

  private setBarTime(time: Date) {
    if (this.barId == null) {
      this.barId = this.timeline.addCustomTime(time, "customBar");
    } else {
      this.timeline.setCustomTime(time, "customBar");
    }
  }

  private calculateStartDate(gameState: any): Date {
    return gameState.startedAt instanceof Date
      ? gameState.startedAt
      : gameState.startedAt.toDate();
  }

  private calculateEndDate(gameState: any): Date {
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

    if (this.game.winner != null && this.items.length == this.processedEvents.size) {
      this.lastEvent = true;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
