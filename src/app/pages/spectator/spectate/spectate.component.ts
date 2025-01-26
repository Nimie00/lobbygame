import {AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {DataSet} from "vis-data";
import {Timeline} from "vis-timeline";
import {SpectatorSerice} from "../../../shared/services/spectator.service";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {LanguageService} from "../../../shared/services/language.service";
import {Replay} from "../../../shared/models/replay";

@Component({
  selector: 'app-spectate',
  templateUrl: './spectate.component.html',
  styleUrls: ['./spectate.component.scss'],
})
export class SpectateComponent implements OnInit, AfterViewInit, OnDestroy {
  private CATEGORY = "Spectate"
  @ViewChild('visualization', {static: false}) visualizationRef!: ElementRef;


  playerChoices: { [username: string]: string } = {};
  @Input() events: {
    className: string,
    timestamp: Date,
    action: string,
    player: string
  }[] = [];

  lobbyId: string | null = null;
  game: any;
  private timeline: Timeline | any = null;
  private items = new DataSet<any>();
  private timer: any = null;
  private container: any;
  private currentTime: any;
  private startDate: any;
  private endDate: any;
  private showCurrentTime: any;
  private maxEndTime: any;
  private minStartTime: any;
  private barId = null;
  private isReplayMode: any;
  private realTimeLine: any;

  initialTimestamp: Date | null = null;
  currentTimestamp: Date | null = null;

  processedEvents: Set<string> = new Set();

  constructor(private route: ActivatedRoute,
              private spectatorService: SpectatorSerice,
              private tracker: SubscriptionTrackerService,
              private languageService: LanguageService,
  ) {
  }

  //TODO: VALAMIÉRT KÉSIK AZ ÓRA NAGYON SOKAT, HA ÉLŐBEN NÉZZÜK A JÁTÉKOT
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
    if (this.timeline && !this.isReplayMode) {
      this.jumpToRealTime();
    }
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
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
      this.currentTimestamp = this.calculateStartDate(gameState);
      this.showCurrentTime = gameState.winner == null;
      this.currentTime = new Date(this.startDate.getTime() - 1000);


      if (this.timeline) {
        this.updateTimelineEvents(gameState.rounds, gameState.players, gameState.playerNames);
      } else {
        this.generateTimelineEvents(gameState.rounds, gameState.players, gameState.playerNames);
        this.initializeTimeline();
      }
    } else {
      console.log("Nincs játék vagy nincsenek benne még körök");
    }
  }

  updateTimelineEvents(rounds: any, players: string[], playerNames: string[]) {
    Object.keys(rounds).forEach((roundIndex) => {
      const round = rounds[roundIndex];

      Object.keys(round.choices).forEach((playerId) => {
        const playerData = round.choices[playerId];
        const uniqueId = `${roundIndex}-${playerId}-${playerData.timestamp.toMillis()}`;

        if (!this.items.get(uniqueId)) {
          const playerIndex = players.indexOf(playerId);
          let playerName = playerId;

          if (playerIndex !== -1 && playerNames[playerIndex]) {
            playerName = playerNames[playerIndex];
          }

          const event = {
            id: uniqueId,
            content: `${playerName}: ${playerData.choice}`,
            start: playerData.timestamp.toDate(),
            className: `${playerIndex}`,
          };
          this.items.add(event);
        }
      });
    });


    this.timeline.redraw();
  }

  generateTimelineEvents(rounds: any, players: string[], playerNames: string[]) {
    this.events = [];

    Object.keys(rounds).forEach((roundIndex) => {
      const round = rounds[roundIndex];

      Object.keys(round.choices).forEach((playerId) => {
        const playerData = round.choices[playerId];

        const playerIndex = players.indexOf(playerId);
        let playerName = playerId;

        if (playerIndex !== -1 && playerNames[playerIndex]) {
          playerName = playerNames[playerIndex];
        }

        const event = {
          action: `${playerName}: ${playerData.choice}`,
          timestamp: playerData.timestamp.toDate(),
          player: playerName,
          className: `${playerIndex}`,
        };

        this.events.push(event);
      });
    });

    this.events.forEach((event, index) => {
      this.items.add({
        id: index,
        content: event.action,
        start: new Date(event.timestamp),
        className: event.className,
      });
    });
  }

  calculateStartDate(gameState: any): Date {
    return gameState.startedAt instanceof Date
      ? gameState.startedAt
      : gameState.startedAt.toDate();
  }

  calculateEndDate(gameState: any): Date {
    if (gameState.winner != null && gameState.endedAt != null) {
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
          return new Date(Date.now() + (2 * 60 * 1000)); // Ha nincs timestamp, akkor mostani idő + 2 perc.
        }
      } else {
        return new Date(Date.now() + (2 * 60 * 1000)); // Ha nincsenek körök, akkor mostani idő + 2 perc.
      }
    }
  }

  initializeTimeline() {
    this.maxEndTime = new Date(this.endDate.getTime() + (2 * 60 * 1000));
    this.minStartTime = new Date(this.startDate.getTime() - (2 * 60 * 1000));

    let lang: string;

    const langSub = this.languageService.getCurrentLanguage().subscribe((language) => {
      lang = language;
    });

    langSub.unsubscribe();

    const options = {
      start: new Date(this.startDate.getTime() - 1500),
      end: new Date(this.endDate.getTime() + 1500),
      editable: false,
      stack: false,
      max: this.maxEndTime,
      min: this.minStartTime,
      orientation: 'bottom',
      locale: lang,
      clickToUse: true,
      margin: {
        item: 10,
        axis: 20,
      },
      horizontalScroll: true,
      verticalScroll: true,
      showCurrentTime: false,
      showMajorLabels: true,
      showMinorLabels: true,
    };
    this.timeline = new Timeline(this.container, this.items, options);

    if (this.showCurrentTime) {
      this.startTimeline(true);
    }

    this.timeline.on('select', (properties: any) => {
      const selectedEvent = this.items.get(properties.items[0]);
      if (selectedEvent) {
        console.log('Event selected:', selectedEvent);
      }
    });

    this.timeline.setItems(this.items);
    this.timeline.redraw();
  }


  startTimeline(realtime: boolean) {
    if (this.timer) {
      console.log(this.timer);
      return;
    }

    const sortedEvents = [...this.events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    this.timer = setInterval(() => {
      if (this.barId == null) {
        this.currentTime = realtime
          ? new Date(Date.now() - 1000)
          : new Date(this.startDate);
      } else {
        // Következő esemény meghatározása
        const nextEvent = sortedEvents.find(event => event.timestamp > this.currentTime);

        if (nextEvent) {
          const timeDifference = nextEvent.timestamp.getTime() - this.currentTime.getTime();

          // Ha az esemény kevesebb mint 1 másodpercen belül van, dinamikusan lépjünk
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
        this.maxEndTime = new Date(this.currentTime.getTime() + 1000); // Növeljük a maximum határt
        this.timeline.setOptions({ max: this.maxEndTime });
      }

      this.setBarTime(this.currentTime);

      const eventsAtCurrentTime = this.items.get({
        filter: (item) => {
          const itemDate = new Date(item.start);
          const timeDifference = Math.abs(itemDate.getTime() - this.currentTime.getTime());
          return timeDifference <= 25; // 0.1 másodperces pontosság
        },
      });

      eventsAtCurrentTime.forEach((event: any) => {
        if (!this.processedEvents.has(event.start)) {
          const [username, choice] = event.content.split(':');
          this.currentTimestamp = event.start;

          const updatedChoices = { ...this.playerChoices };
          updatedChoices[username.trim()] = choice.trim();
          this.playerChoices = updatedChoices;

          this.processedEvents.add(event.start);
        }
      });
    }, 25);
  }

  stopTimeline() {
    clearInterval(this.timer);
    this.timer = null;
  }

  jumpToStart() {
    this.playerChoices = {};
    this.processedEvents.clear();
    this.currentTime = new Date(this.startDate.getTime());
    this.initialTimestamp = this.currentTime;
    this.currentTimestamp = this.initialTimestamp;
    this.setBarTime(this.currentTime)
    this.stopTimeline();
  }

  setBarTime(time: Date) {
    if (this.barId == null) {
      this.barId = this.timeline.addCustomTime(time, "customBar")
    } else {
      this.timeline.setCustomTime(time, "customBar")
    }
  }

  jumpToFirstEvent() { //jó
    this.playerChoices = {};
    if (this.events.length > 0) {
      const sortedEvents = [...this.events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      this.initialTimestamp = new Date(sortedEvents[0].timestamp.getTime() - 1000);
      this.currentTimestamp = this.initialTimestamp;
      this.currentTime = new Date(this.initialTimestamp.getTime() - 1000);
      this.setBarTime(this.currentTime)
      this.stopTimeline();
    } else {
      console.warn("Nincs event")
    }
  }

  jumpToNextEvent() { //TODO: Meg kellene csinálni azt, hogy két eventnek nem lehet ugyanaz az időpontja
    if (this.events.length > 0) {
      const sortedEvents = [...this.events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      let nextEventIndex = sortedEvents.findIndex(event => event.timestamp > (this.currentTime.getTime() + 1000));

      if (nextEventIndex === -1) {
        nextEventIndex = 0;
      }

      const nextEvent = sortedEvents[nextEventIndex];
      const prevEvent = sortedEvents[nextEventIndex - 1] || null;

      if (prevEvent) {
        const timeDifference = nextEvent.timestamp.getTime() - prevEvent.timestamp.getTime();

        if (timeDifference <= 1000) {
          const midpointTime = prevEvent.timestamp.getTime() + timeDifference / 2;
          this.currentTime = new Date(midpointTime);
          console.log("Feléhez")
        } else {
          this.currentTime = new Date(nextEvent.timestamp.getTime() - 1000);
          console.log("Több a differencia mint 1 mp")
        }
      } else {
        this.currentTime = new Date(nextEvent.timestamp.getTime() - 1000);
        console.log("Nincs előző event")
      }

      this.setBarTime(this.currentTime);
    } else {
      console.warn("Nincs event");
    }
  }

  jumpToRealTime() {
    this.stopTimeline();
    this.timeline.removeCustomTime(this.barId);
    this.barId = null;
    this.startTimeline(true);
  }
}


/*
startTimeline(realtime: boolean) {
  if (this.timer) {
    console.log(this.timer);
    return;
  }

  this.timer = setInterval(() => {
    if (this.barId == null) {
      this.currentTime = realtime
        ? new Date(Date.now() - 1000)
        : new Date(this.startDate);
    } else {
      this.currentTime = new Date(this.currentTime.getTime() + 1000);
    }

    if (this.currentTime > this.maxEndTime) {
      this.maxEndTime = new Date(this.currentTime.getTime() + 1000); // Növeljük a maximum határt
      this.timeline.setOptions({max: this.maxEndTime});
    }

    this.setBarTime(this.currentTime)

    const eventsAtCurrentTime = this.items.get({
      filter: (item) => {
        const itemDate = new Date(item.start);
        return (
          itemDate.getHours() === this.currentTime.getHours() &&
          itemDate.getMinutes() === this.currentTime.getMinutes() &&
          itemDate.getSeconds() === this.currentTime.getSeconds()
        );
      },
    });

    if (eventsAtCurrentTime.length > 0) {
      eventsAtCurrentTime.forEach((event: any) => {
        const [username, choice] = event.content.split(':');
        this.currentTimestamp = event.start;
        const updatedChoices = {...this.playerChoices};
        updatedChoices[username.trim()] = choice.trim();
        this.playerChoices = updatedChoices;
      });
    }
  }, 1000);
}

 */
