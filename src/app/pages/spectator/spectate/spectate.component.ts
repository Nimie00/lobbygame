import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {DataSet} from "vis-data";
import {Timeline} from "vis-timeline";
import {SpectatorSerice} from "../../../shared/services/spectator.service";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {LanguageService} from "../../../shared/services/language.service";

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




  constructor(private route: ActivatedRoute,
              private spectatorService: SpectatorSerice,
              private tracker: SubscriptionTrackerService,
              private languageService: LanguageService,
              ) {
  }

  ngOnInit(): void {
    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  ngAfterViewInit() {
    this.container = document.getElementById('visualization');
    if (!this.container) {
      return;
    }
    const gameSub = this.spectatorService.getGameState(this.lobbyId).subscribe((gameState) => {
      this.game = gameState;
      if (gameState && gameState.rounds) {
        this.startDate = this.calculateStartDate(gameState); //Kezdeti időpont
        this.endDate = this.calculateEndDate(gameState); //Utolsó időpont
        this.showCurrentTime = gameState.winner == null; //Megy-e még a játék (azért fontos, mert ha már nem akkor máshogyan kell a timeline-t megjeleníteni)

        if (this.timeline) {
          this.updateTimelineEvents(gameState.rounds, gameState.players, gameState.playerNames);
        } else {
          this.generateTimelineEvents(gameState.rounds, gameState.players, gameState.playerNames);
          this.initializeTimeline();
        }
      } else {
        console.log("Nincs játék vagy nincsenek benne még körök")
      }
    });
    this.tracker.add(this.CATEGORY, "getGameAndUserSub", gameSub);
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
            style: playerIndex === 1 ? "background-color: red;" : "background-color: blue;"
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
          className: `${playerIndex}`, // Meghatározott formátumú osztálynév
        };

        this.events.push(event);
      });
    });

    this.events.forEach((event, index) => {
      this.items.add({
        id: index,
        content: event.action,
        start: new Date(event.timestamp),
        className: event.className, // Az előre meghatározott osztálynév használata
        style: event.className === '1' ? "background-color: red;" : "background-color: blue;"
      });
    });
  }


  calculateStartDate(gameState: any): Date {
    return gameState.startedAt instanceof Date
      ? gameState.startedAt
      : gameState.startedAt.toDate();
  }

  calculateEndDate(gameState: any): Date {
    if (gameState.winner != null) {
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
    this.maxEndTime = new Date(this.endDate.getTime() + (60 * 60 * 1000));
    this.minStartTime = new Date(this.startDate.getTime() - (60 * 60 * 1000));

    let lang: string;

    const langSub = this.languageService.getCurrentLanguage().subscribe((language) => {
      lang = language;
    });

    langSub.unsubscribe();

    const options = {
      start: new Date(this.startDate.getTime()-1500),
      end: new Date(this.endDate.getTime()+1500),
      editable: false,
      stack: false,
      showCurrentTime: false,
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
      showMajorLabels: true,
      showMinorLabels: true,
    };

    this.timeline = new Timeline(this.container, this.items, options);
    this.timeline.on('select', (properties: any) => {
      const selectedEvent = this.items.get(properties.items[0]);
      if (selectedEvent) {
        console.log('Event selected:', selectedEvent);
      }
    });

    this.timeline.setItems(this.items);
    this.timeline.redraw();
  }


  startTimeline() {
    if (this.timer){
      return;
    }
    this.timer = setInterval(() => {
      if (this.barId == null) {
        this.currentTime = new Date(this.startDate);
      } else {
        this.currentTime = new Date(this.currentTime.getTime() + 1000);
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


          //Másként az OnChanges nem érzékeli a másik komponensben
          const updatedChoices = { ...this.playerChoices };
          updatedChoices[username.trim()] = choice.trim();
          this.playerChoices = updatedChoices;

        });
      }

      if (this.currentTime >= this.endDate) {
        console.log("Az idő túl ment az utolsó dátumon, megáll az időzítő")
        this.stopTimeline();
      }
    }, 1000);
  }


  stopTimeline() {
    clearInterval(this.timer);
    this.timer = null;
  }

  jumpToStart() {
    this.playerChoices = {};
    this.currentTime = new Date(this.startDate.getTime());
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
}
