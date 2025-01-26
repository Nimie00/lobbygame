import {Component, EventEmitter, OnDestroy, OnInit, Renderer2} from '@angular/core';
import {RpsService} from "../../../shared/services/game-services/rps.service";
import {ActivatedRoute, Router} from "@angular/router";
import {LobbyService} from "../../../shared/services/lobby.service";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {AuthService} from "../../../shared/services/auth.service";
import {switchMap} from "rxjs/operators";
import {LanguageService} from "../../../shared/services/language.service";
import {animate, keyframes, state, style, transition, trigger} from '@angular/animations';
import {BaseGame} from "../../../shared/models/games.gameplaydata.model";
import {ProcessedRound} from "../../../shared/models/ProcessedRound";
import {RoundData} from "../../../shared/models/RoundData";
import {User} from "../../../shared/models/user.model";

type RoundEntry = [string, RoundData];


@Component({
  selector: 'app-rps',
  templateUrl: './rps.component.html',
  styleUrls: ['./rps.component.scss'],
  animations: [

    trigger('countdownAnimation', [
      transition(':enter', [
        style({opacity: 0, transform: 'scale(0.3)'}),
        animate('0.5s ease-out', style({opacity: 1, transform: 'scale(1)'})),
      ]),
      transition(':leave', [
        animate('0.5s ease-in', style({opacity: 0, transform: 'scale(0.3)'}))
      ])
    ]),

    trigger('playerChoiceAnimation', [
      state('void', style({opacity: 0})),
      state('*', style({opacity: 1})),
      transition('void => *', [
        animate('0.3s ease-out', keyframes([
          style({opacity: 0, transform: 'translateY(50%)', offset: 0}),
          style({opacity: 1, transform: 'translateY(-20%)', offset: 0.7}),
          style({opacity: 1, transform: 'translateY(0)', offset: 1})
        ]))
      ])
    ]),

    trigger('resultAnimation', [
      transition(':enter', [
        style({opacity: 0}),
        animate('0.3s ease-out', style({opacity: 1}))
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({opacity: 0}))
      ])
    ]),

    trigger('finalChoice', [
      state('shown', style({transform: 'translateX(0)', opacity: 1})),
      transition(':enter', [
        style({transform: 'translateX(45%)', opacity: 0}),
        animate('0.3s ease-out')
      ])
    ]),

    trigger('enemyChosenCycle', [
      transition('* => *', [
        animate('1.05s ease-in-out', keyframes([
          style({transform: 'translateX(100%) translateY(-50%)', opacity: 0, offset: 0}),
          style({transform: 'translateX(50%) translateY(-50%)', opacity: 0, offset: 0.2}),
          style({transform: 'translateX(-50%) translateY(-50%)', opacity: 0.7, offset: 0.7}),
          style({transform: 'translateX(-100%) translateY(-50%)', opacity: 0, offset: 1})
        ]))
      ])
    ]),

    trigger('playerMoveToCenter', [
      transition('* => *', [
        animate('1.5s cubic-bezier(0.2, 1, 0.5, 1)',
          keyframes([
            // Start position
            style({ transform: 'translateY(-50%)', offset: 0 }),
            // Move partial distance to center
            style({ transform: 'translateX(calc(25vw))  translateY(-50%)', offset: 0.5 }),
            // Brief stop
            style({ transform: 'translateX(calc(25vw))  translateY(-50%)', offset: 0.6}),
            // Return towards start
            style({ transform: 'translateX(-50%) translateY(-50%)', offset: 1 })
          ])
        )
      ])
    ]),

    trigger('moveToCenterOpponent', [
      transition('* => *', [
        animate('1.5s cubic-bezier(0.2, 1, 0.5, 1)',
          keyframes([
            // Start position
            style({ transform: 'translateY(-50%)', offset: 0 }),
            // Move partial distance to center
            style({ transform: 'translateX(calc(-25vw)) translateY(-50%)', offset: 0.5 }),
            // Brief stop
            style({ transform: 'translateX(calc(-25vw)) translateY(-50%)', offset: 0.6 }),
            // Return towards start
            style({ transform: 'translateX(+50%) translateY(-50%)', offset: 1 })
          ])
        )
      ])
    ]),

    trigger('spriteAnimation', [
      transition(':enter', [
        animate('4s steps(39)', keyframes([
          style({
            objectPosition: '-7800px 0',
            offset: 1,
          })
        ]))
      ])
    ])
  ],
})

export class RpsComponent implements OnInit, OnDestroy {
  private CATEGORY = "rps-game"
  game: BaseGame;
  currentUser: User;
  lobbyId: string;
  debug: boolean;
  countdown: number = 3;
  roundTimer = 0;
  timerInterval: any;

  playerAnimationDone = new EventEmitter<void>();
  opponentAnimationDone = new EventEmitter<void>();

  otherPlayer: string;
  gameStarted: boolean = false;
  playerChoice: string | null = null;
  gameEnded: boolean = false;
  winner: string | null = null;
  endReason: string;
  isPlayer: boolean;
  isSpectator: boolean;
  drawCount: number;
  opponentChosen: boolean = false;
  opponentChoice: string = null;
  playerScore: number;
  opponentScore: number;
  requiredWins: number;
  roundLength: number;


  selectedRound: number = 0;
  currentRound: number = 0;
  realRoundNumber: number;

  cyclingState: number = 0;
  currentCyclingChoice: string = 'papir';
  choices: string[] = ['ko', 'papir', 'ollo'];
  cyclingInterval: any;
  youWon: boolean = false;

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

  animationPhase: 'moving' | 'showing-loser' | 'resetting' = 'moving';
  loserPosition: 'left' | 'right' = 'left';
  losingChoice: string = null;
  animationState: string = 'initial';
  isInteractionDisabled: boolean = false;


  constructor(
    private route: ActivatedRoute,
    private rpsService: RpsService,
    private lobbyService: LobbyService,
    private tracker: SubscriptionTrackerService,
    private authService: AuthService,
    private firestore: AngularFirestore,
    private router: Router,
    protected translateService: LanguageService,
    private renderer: Renderer2
  ) {
    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }

  //TODO: Megoldani, hogyha a játék véget ér és valaki spectator volt a játékban akkor kilépjen a váró nézőiből? (ezt még ki kell találni)
  //TODO: MEGOLDANI, HOGY AZ ELLENFÉL választása is látszódjon és legyen egy 3mp-es időtartam utánna amikor kiírjuk, hogy ki nyerte a kört


  ngOnInit() {
    this.debug = localStorage.getItem('debug') === 'true';
    this.startInitialCountdown();

    const rpsSubscription = this.authService.getUserData()
      .pipe(
        switchMap((user) => {
          this.currentUser = user;
          return this.rpsService.getGameState(this.lobbyId); // Várakozás a játék állapotára
        })
      )
      .subscribe({
        next: async (game) => {
          this.game = game;

          this.isPlayer = this.game.players.includes(this.currentUser.id);
          this.isSpectator = this.game.spectators.includes(this.currentUser.id);
          this.winner = this.game.winner;
          this.otherPlayer = this.game.players.filter((_ele: any, idx: any) => idx !== this.game.players.indexOf(this.currentUser.id))[0];
          this.rounds = this.getRounds();
          this.roundLength = this.game.gameModifiers?.timed ?? 0;
          this.game.startedAt = game.startedAt.toDate()

          this.roundTimer = this.calculateRemainingTimeAtStart(this.game.startedAt, this.roundLength);

          await this.redirectPlayer()

          if (this.game.status === 'ended' || this.game.winner !== null) {
            this.gameEnded = true;
            rpsSubscription.unsubscribe();
            return;
          }


          if (this.game && this.isPlayer) {

            this.currentRound = this.game.currentRound;
            const currentRoundData = this.game.rounds?.[this.currentRound];

            if (this.selectedRound <= this.currentRound) {
              if (this.currentRound >= 1) {
                this.roundTimer = this.calculateRemainingTimeMidRound(this.game.rounds?.[this.currentRound - 1], this.roundLength);
                this.startRoundTimer();
              }

            }

            this.updateDrawCountAndRealRoundNumber();
            this.updatePlayerScores()

            if (currentRoundData) {
              this.playerChoice = currentRoundData.choices?.[this.currentUser.id]?.choice || null;
              this.opponentChoice = currentRoundData.choices?.[this.otherPlayer]?.choice || null;

              if (this.opponentChoice !== null && this.playerChoice === null) {
                this.opponentChosen = true;
                this.startChoiceCycling();
              }

              if (this.playerChoice && this.opponentChoice) {
                await this.evaluateRound();
                await this.handleAnimations();
              }


              if (this.currentUser.id === this.game.ownerId) {
                const allPlayersChosen = this.game.players.every(
                  (playerId: string) => !!currentRoundData.choices?.[playerId]?.choice
                );


                if (allPlayersChosen && !this.gameEnded) {
                  await this.determineWinner(this.game);
                }
              }
            }
          }
        }
      });


    this.tracker.add(this.CATEGORY, "getGameAndUserSub", rpsSubscription);
  }


  private async handleAnimations(): Promise<void> {
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

    this.animationPhase = 'showing-loser';

    await new Promise(resolve => setTimeout(resolve, 0));
    this.positionSprite()
    await new Promise(resolve => setTimeout(resolve, 3000));

    this.animationPhase = 'resetting';
    this.resetPlayersChoice();
  }


  private positionSprite() {
    const sprite = document.querySelector('.loser-sprite') as HTMLElement;
    const loserElementType = this.youWon ? 'opponent' : 'player';
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
  }


  private async evaluateRound(): Promise<void> {
    if (!this.playerChoice || !this.opponentChoice) return;

    const matchup = `${this.playerChoice}:${this.opponentChoice}`;

    if (this.outcomeRules.winStates[matchup]) {
      this.animationState = this.outcomeRules.winStates[matchup];
      this.youWon = true;
    } else if (this.outcomeRules.winStates[`${this.opponentChoice}:${this.playerChoice}`]) {
      this.animationState = this.outcomeRules.winStates[`${this.opponentChoice}:${this.playerChoice}`];
      this.youWon = false;
    } else {
      this.animationState = this.outcomeRules.drawStates[this.playerChoice];
      this.youWon = null;
    }

    this.loserPosition = this.youWon ? 'right' : 'left';
    this.losingChoice = this.youWon ? this.opponentChoice : this.playerChoice;
    if (this.youWon === null) {
      this.losingChoice = null;
    }

  }

  private resetPlayersChoice(): void {
    this.playerChoice = null;
    this.opponentChoice = null;
    this.opponentChosen = false;
    this.animationState = 'initial';
    this.youWon = null;
    this.losingChoice = null;
    this.animationPhase = 'moving';
    this.isInteractionDisabled = false;
    this.selectedRound = this.currentRound;
    if (this.cyclingInterval) {
      clearInterval(this.cyclingInterval);
    }
  }

  calculateRemainingTimeMidRound(currentRoundData: any, roundDuration: number): number {

    if (!currentRoundData?.choices || roundDuration <= 0) {
      return 0;
    }
    let latestTimestamp: any = 0;

    for (const playerId in currentRoundData.choices) {
      const choice = currentRoundData.choices[playerId];
      if (choice?.timestamp) {
        const choiceDate = choice.timestamp.toDate(); // Firestore .toDate() metódus
        if (!latestTimestamp || choiceDate.getTime() > latestTimestamp) {
          latestTimestamp = choiceDate.getTime();
        }
      }
    }

    const currentTime = new Date().getTime();
    const endOfRoundTime = latestTimestamp + roundDuration * 1000;
    const remainingTime = endOfRoundTime - currentTime;
    return Math.max(0, Math.floor(remainingTime / 1000));
  }

  startRoundTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
      if (this.roundTimer > 0) {
        this.roundTimer--;
      } else {
        clearInterval(this.timerInterval);
        console.log("Lejárt az idő >:(");
        console.log("A felhasználó ezt választotta: ", this.playerChoice);
        console.log("Az ellenfél ezt választotta: ", this.opponentChoice);
      }
    }, 1000);
  }

  startInitialCountdown() {
    this.gameStarted = false;
    const countdownInterval = setInterval(() => {
      if (this.countdown > 1) {
        this.countdown--;
      } else {
        clearInterval(countdownInterval);
        this.gameStarted = true;
        if (this.currentRound === 0) {
          this.startRoundTimer();
        }
      }
    }, 1000);
  }

  private updateDrawCountAndRealRoundNumber(): void {
    if (this.game?.rounds) {
      this.drawCount = Object.values(this.game.rounds).filter(
        (round: any) => round.winner === "draw"
      ).length;
    }
    this.realRoundNumber = this.rounds.length - this.drawCount + 1; //Azért van itt a +1 hogy ne 0-tól legyenek indexelve a körök
  }

  private calculateRoundWinner(player1Choice: string, player2Choice: string, player1Id: string, player2Id: string): string {
    const rules = {
      ko: ['ollo'],
      papir: ['ko'],
      ollo: ['papir']
    };

    if (player1Choice === player2Choice) return 'draw';
    return rules[player1Choice]?.includes(player2Choice) ? player1Id : player2Id;
  }

  private calculatePotentialWinner(players: string[], roundWinner: string): {
    potentialWinner?: string;
    remainingWinsDict: Record<string, number>;
  } {
    const remainingWinsDict = Object.fromEntries(
      players.map(player => [player, this.getRemainingWins(player)])
    );

    remainingWinsDict[roundWinner] -= 1; //Figyelembe kell venni azt, hogy melyik játékos nyerte meg az aktuális kört ezért itt ki kell egyet vonni

    const potentialWinner = players.find(player => remainingWinsDict[player] === 0);
    return {potentialWinner, remainingWinsDict};
  }

  private prepareRoundUpdates(currentRound: number, roundWinner: string, newMaxRounds: number, remainingWinsDict: any, potentialWinner?: string): any {
    const isFinalRound = currentRound >= newMaxRounds - 1;
    const update: any = {
      [`rounds.${currentRound}.winner`]: roundWinner,
      maxRounds: newMaxRounds,
      currentRound: isFinalRound ? currentRound : currentRound + 1
    };

    if (potentialWinner) {
      update.winner = potentialWinner;
      update.endReason = 'Someone Won';
    } else if (isFinalRound) {
      const isDraw = Object.values(remainingWinsDict).every(
        (wins, _, arr) => wins === arr[0]
      );

      if (isDraw) {
        update.winner = '#Drew';
        update.endReason = 'Drew';
      }
    }

    this.endReason = update.endReason;

    return update;
  }

  private async updateGameState(lobbyId: string, updates: any, isFinal: boolean): Promise<void> {
    const docRef = this.firestore.collection('gameplay').doc(lobbyId);

    await docRef.update(updates);

    if (isFinal) {
      await this.endGame();
    } else {
      this.selectedRound = updates.currentRound;
    }
  }

  private async determineWinner(gameData: any) {
    let {currentRound, maxRounds} = gameData;
    let roundWinner: string;
    const players = Object.keys(gameData.rounds[currentRound]?.choices);
    const [choice1, choice2] = [
      gameData.rounds[currentRound].choices[players[0]]?.choice,
      gameData.rounds[currentRound].choices[players[1]]?.choice,
    ];


    roundWinner = this.calculateRoundWinner(choice1, choice2, players[0], players[1])


    const {potentialWinner, remainingWinsDict} = this.calculatePotentialWinner(players, roundWinner)


    const roundUpdate = this.prepareRoundUpdates(
      currentRound,
      roundWinner,
      maxRounds + (roundWinner === 'draw' ? 1 : 0),
      remainingWinsDict,
      potentialWinner,
    );


    await this.updateGameState(gameData.lobbyId, roundUpdate, !!potentialWinner || this.endReason == 'Drew');
  }

  makeChoice(choice: string) {
    if (!this.playerChoice && this.currentUser) {
      this.playerChoice = choice;
      this.rpsService.makeChoice(this.lobbyId, choice, this.currentUser.id, this.currentRound);
    }
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
    if (this.cyclingInterval) {
      clearInterval(this.cyclingInterval);
    }
  }

  getRemainingWins(playerId: string): number {
    if (!this.game || !this.game.rounds || this.game.gameEnded == true) {
      return -1;
    }

    this.drawCount = Object.values(this.game.rounds).filter((round: any) => round.winner === "draw").length;
    this.requiredWins = Math.ceil((this.game.maxRounds - this.drawCount + 1) / 2);
    const playerWins = Object.values(this.game.rounds).filter((round: any) => round.winner === playerId).length;
    return this.requiredWins - playerWins
  }

  getPlayerName(playerId: string): string {
    const index = this.game.players.indexOf(playerId);
    return index !== -1 ? this.game.playerNames[index] : `${this.translateService.translate("UNKNOWN_PLAYER")}: (${playerId})`;
  }

  getScoreCircles(requiredWins: number): number[] {
    return Array(requiredWins).fill(0);
  }

  private async endGame() {
    try {
      await this.lobbyService.endLobby(this.lobbyId, this.winner, this.endReason);
      this.gameEnded = true;
    } catch (error) {
      console.error('Error ending the game:', error);
    }
  }

  private getRounds(): ProcessedRound[] {
    if (!this.game?.rounds) return [];

    return (Object.entries(this.game.rounds) as RoundEntry[])
      .filter((entry): entry is RoundEntry => {
        const [roundNumber] = entry;
        return !isNaN(Number(roundNumber));
      })
      .map(([roundNumber, roundData]) => ({
        roundNumber: Number(roundNumber),
        choices: roundData.choices || {},
        winner: roundData.winner || null
      }));
  }

  private async redirectPlayer() {
    if (!this.isPlayer && this.isSpectator) {
      await this.router.navigate(['/spectate/' + this.lobbyId]);
      return;
    }

    if (!this.isPlayer && !this.isSpectator) {
      await this.router.navigate(['/lobbies/' + this.lobbyId]);
      return;
    }
  }

  private updatePlayerScores() {
    this.playerScore = Object.values(this.game.rounds).filter((round: any) => round.winner === this.currentUser.id).length;
    this.opponentScore = Object.values(this.game.rounds).filter((round: any) => round.winner === this.otherPlayer).length;
  }

  calculateRemainingTimeAtStart(startedAt: Date, roundDuration: number) {
    const now = new Date().getTime();
    const startTime = new Date(startedAt).getTime() + 3000;
    const endTime = startTime + roundDuration * 1000;
    return Math.max(0, Math.floor((endTime - now) / 1000));
  };

  private startChoiceCycling() {
    let index = 0;
    this.cyclingInterval = setInterval(() => {
      this.currentCyclingChoice = this.choices[index];
      this.cyclingState++;
      this.cyclingState = this.cyclingState % 5;
      index = (index + 1) % this.choices.length;
    }, 1000);
  }


}
