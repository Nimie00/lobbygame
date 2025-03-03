import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges
} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {SubscriptionTrackerService} from "../../../../shared/services/subscriptionTracker.service";
import {LanguageService} from "../../../../shared/services/language.service";
import {KeyValue} from "@angular/common";
import {AudioService} from "../../../../shared/services/audio.service";
import {
  playerChoiceAnimation,
  finalChoice,
  player1MoveToCenter,
  player2MoveToCenter,
  spriteAnimationShort,
} from '../../../games/rps/rps.component-animations';

@Component({
  selector: 'app-rps-spectate',
  templateUrl: './rps-spectate.component.html',
  styleUrls: ['./rps-spectate.component.scss'],
  animations: [
    playerChoiceAnimation,
    finalChoice,
    player1MoveToCenter,
    player2MoveToCenter,
    spriteAnimationShort]
})

export class RpsSpectateComponent implements OnInit, OnDestroy, OnChanges {
  private CATEGORY = "rpsSpectate";
  @Input() game!: any;
  @Input() playerChoices: { [username: string]: string } = {};
  @Input() skipAnimations!: boolean;
  @Output() playingAnimations = new EventEmitter<boolean>();


  playerAnimationDone = new EventEmitter<void>();
  opponentAnimationDone = new EventEmitter<void>();

  lobbyId: string;
  winner: string | null = null;
  winnerName: string;
  timeline: any[] = [];
  choice1: string = null;
  choice2: string = null;
  name1: string;
  name2: string;
  player1Id: string;
  player2Id: string;
  allChanges: number = -1;
  roundChanges: number = -1;


  player1choice: string = null;
  player2choice: string = null;
  losingChoice: string = null;

  animationState: string = 'initial';
  choices: string[] = ['ko', 'papir', 'ollo'];
  animationPhase: 'moving' | 'showing-loser' | 'resetting' = 'moving';
  debug: boolean;
  roundTimer: number = 0;
  currentRound: number = 0;
  drawCount: number;
  player1Score: number = 0;
  player2Score: number = 0;
  requiredWins: number;
  roundLength: number;
  player1Required: number = 0;
  player2Required: number = 0;
  player1Remaining: number = 0;
  player2Remaining: number = 0;
  player1Won: boolean = false;

  player1WONALLGAME: boolean = false;
  gameEnded: boolean = false;
  totalRounds: number = 0;
  player1WonRounds: number;
  player2WonRounds: number;
  private playmusic: boolean;
  private playOnce: boolean = true;


  protected rounds: {
    roundNumber: number;
    choices: { [player: string]: { choice: string; timestamp: Date } };
    winner: string | null
  }[];

  private readonly outcomeRules = {
    winStates: {
      'ko:ollo': 'rockBeatsScissors',
      'papir:ko': 'paperBeatsRock',
      'ollo:papir': 'scissorsBeatsPaper'
    },

    drawStates: {
      ko: 'rockVSRock',
      papir: 'paperVsPaper',
      ollo: 'scissorsVsScissors'
    }
  };



  constructor(
    private route: ActivatedRoute,
    private tracker: SubscriptionTrackerService,
    private renderer: Renderer2,
    private languageService: LanguageService,
    private router: Router,
    private audioService: AudioService,
  ) {

    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }

  ngOnInit() {
    this.name1 = this.game.playerNames[0]
    this.name2 = this.game.playerNames[1]
    this.player1Id = this.game.players[0]
    this.player2Id = this.game.players[1]
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['playerChoices'] && changes['playerChoices'].currentValue) {
      if (changes['playerChoices'] && Object.keys(changes['playerChoices'].currentValue).length === 0) {
        this.allChanges = -1;
        this.roundChanges = -1;
        this.player1Score = 0;
        this.player2Score = 0;
        this.playerChoices[this.name1] = null;
        this.playerChoices[this.name2] = null;
      }
      this.playerChoices = changes['playerChoices'].currentValue;
      this.allChanges += 1;
      this.roundChanges += 1;
      this.choice1 = this.playerChoices[this.name1]
      this.choice2 = this.playerChoices[this.name2]

      this.player1choice = this.choice1;
      this.player2choice = this.choice2;

      this.currentRound = Math.floor(this.allChanges / 2);
      this.updateScores();
      if (this.roundChanges === 2) {
        await this.evaluateRound()
        await this.handleAnimations()


        setTimeout(() => {
          this.animationState = 'initial';
          this.player1choice = null;
          this.player2choice = null;
          this.choice1 = null;
          this.choice2 = null;
          this.playingAnimations.emit(false);
          this.playOnce = true;
          this.playmusic = false;
          this.gameEnded = (this.player2Remaining == 0 || this.player1Remaining == 0);
        }, 1);
      }
    }
    if (changes['skipAnimations'] && changes['skipAnimations'].currentValue) {
      this.skipAnimations = changes['skipAnimations'].currentValue;
    }
  }

  updateScores() {
    if (!this.game || !this.game.rounds)
      return;

    this.rounds = this.game.rounds;

    const maxIndex = Math.floor(this.allChanges / 2);

    this.drawCount = Object.entries(this.game.rounds)
      .filter(([index, round]: [string, any]) =>
        parseInt(index) < maxIndex && round.winner === "draw"
      ).length;

    this.requiredWins = Math.ceil((this.game.bestOfRounds + 1) / 2);

    const player1Wins = Object.entries(this.game.rounds)
      .filter(([index, round]: [string, any]) =>
        parseInt(index) < maxIndex && round.winner === this.player1Id
      ).length;

    this.player1Required = this.requiredWins;
    this.player1Remaining = this.requiredWins - player1Wins;

    const player2Wins = Object.entries(this.game.rounds)
      .filter(([index, round]: [string, any]) =>
        parseInt(index) < maxIndex && round.winner === this.player2Id
      ).length;

    this.player2Required = this.requiredWins;
    this.player2Remaining = this.requiredWins - player2Wins;


    if (this.player1Remaining == 0 && this.player2Remaining > 0)
      this.player1WONALLGAME = true

    if (this.player2Remaining == 0 && this.player1Remaining > 0)
      this.player1WONALLGAME = false

    this.gameEnded = (this.player2Remaining == 0 || this.player1Remaining == 0) && !this.playingAnimations;
    this.winnerName = this.player1WONALLGAME ? this.name1 : this.name2;
    this.totalRounds = Object.entries(this.game.rounds).length;
    this.player1WonRounds = player1Wins;
    this.player2WonRounds = player2Wins;
  }

  getScoreCircles(totalRequired: number): number[] {
    return Array(totalRequired).fill(0);
  }

  private positionSprite() {

    if (this.losingChoice && this.animationPhase === 'showing-loser') {
      if (this.playmusic && this.playOnce) {
        this.playOnce = false;
        this.audioService.playSoundByName("explosion.wav");
      }
      setTimeout(() => {
        const sprite = document.querySelector('.loser-sprite') as HTMLElement;
        const loserElementType = this.player1Won ? 'player2' : 'player1';
        const loserElement = document.querySelector(`.${loserElementType}-choice`) as HTMLElement;

        if (sprite && loserElement) {
          this.renderer.setStyle(loserElement, 'opacity', '0');
          this.renderer.setStyle(sprite, 'opacity', '0');

          const container = document.querySelector('.animation-container');
          const containerRect = container.getBoundingClientRect();

          const loserRect = loserElement.getBoundingClientRect();

          const x = loserRect.left - containerRect.left + (loserRect.width / 2);
          const y = loserRect.top - containerRect.top + (loserRect.height / 2);


          this.renderer.setStyle(sprite, 'position', 'absolute');
          this.renderer.setStyle(sprite, 'left', `${x}px`);
          this.renderer.setStyle(sprite, 'top', `${y}px`);

          this.renderer.setStyle(sprite, 'opacity', '1');
          sprite.classList.add('animate');
        }
      }, 0);
    }
  }

  async evaluateRound() {
    if (!this.player1choice || !this.player2choice) return;

    const matchUp = `${this.player1choice}:${this.player2choice}`;

    if (this.outcomeRules.winStates[matchUp]) {
      this.animationState = this.outcomeRules.winStates[matchUp];
      this.player1Score += 1;
      this.player1Won = true;
      this.playmusic = true;
    } else if (this.outcomeRules.winStates[`${this.player2choice}:${this.player1choice}`]) {
      this.animationState = this.outcomeRules.winStates[`${this.player2choice}:${this.player1choice}`];
      this.player1Won = false;
      this.player2Score += 1;
      this.playmusic = true;
    } else {
      this.animationState = this.outcomeRules.drawStates[this.player1choice];
      this.player1Won = null;
    }

    this.losingChoice = this.player1Won ? this.player2choice : this.player1choice;
    if (this.player1Won === null) {
      this.losingChoice = null;
    }

    this.roundChanges = 0;
    this.playerChoices[this.name1] = null;
    this.playerChoices[this.name2] = null;

  }

  private async handleAnimations(): Promise<void> {
    if (!this.skipAnimations) {
      this.playingAnimations.emit(true);
      this.animationPhase = 'moving';

      await Promise.all([
        new Promise<void>(resolve => {
          const sub = this.playerAnimationDone.subscribe(() => {
            sub.unsubscribe();
            resolve();
          });
        }),
        new Promise<void>(resolve => {
          const sub = this.opponentAnimationDone.subscribe(() => {
            sub.unsubscribe();
            resolve();
          });
        })
      ]);


      await new Promise(resolve => setTimeout(resolve, 0));
      this.animationPhase = 'showing-loser';
      this.positionSprite()
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.animationPhase = 'resetting';
    }
  }

  async goToWatchingReplay() {
    await this.router.navigate(['/lobbies/' + 'replays:' + this.lobbyId]);
  }

  sortByRoundNumber(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return a.value.roundNumber - b.value.roundNumber;
  }

}

