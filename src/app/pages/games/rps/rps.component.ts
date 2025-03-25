import {Component, EventEmitter, OnDestroy, OnInit, Renderer2} from '@angular/core';
import {RpsService} from "../../../shared/services/game-services/rps.service";
import {ActivatedRoute, Router} from "@angular/router";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {AuthService} from "../../../shared/services/auth.service";
import {debounceTime, filter} from "rxjs/operators";
import {LanguageService} from "../../../shared/services/language.service";

import {RPSGame} from "../../../shared/models/games/games.rps.gameplaydata.model";
import {ProcessedRound} from "../../../shared/models/ProcessedRound";
import {RoundData} from "../../../shared/models/RoundData";
import {User} from "../../../shared/models/user.model";
import {distinctUntilChanged, interval, Subscription, take} from "rxjs";
import {AudioService} from "../../../shared/services/audio.service";
import {
  countdownAnimation,
  playerChoiceAnimation,
  resultAnimation,
  finalChoice,
  cycleAnimation,
  playerMoveToCenter,
  moveToCenterOpponent,
  spriteAnimation
} from './rps.component-animations';
import {EndGameService} from "../../../shared/services/game-services/endGameService";

type RoundEntry = [string, RoundData];


@Component({
  selector: 'app-rps',
  templateUrl: './rps.component.html',
  styleUrls: ['./rps.component.scss'],
  animations: [
    countdownAnimation,
    playerChoiceAnimation,
    resultAnimation,
    finalChoice,
    cycleAnimation,
    playerMoveToCenter,
    moveToCenterOpponent,
    spriteAnimation
  ]
})

export class RpsComponent implements OnInit, OnDestroy {
  private CATEGORY: string = "rps-game"
  playerAnimationDone: EventEmitter<void> = new EventEmitter<void>();
  opponentAnimationDone: EventEmitter<void> = new EventEmitter<void>();
  game: RPSGame;
  currentUser: User;
  lobbyId: string;
  otherPlayerId: string;
  endReason: string;
  playerChoice: string = null;
  winner: string = null;
  opponentChoice: string = null;
  losingChoice: string = null;
  currentCyclingChoice: string = 'papir';
  animationState: string = 'initial';
  choices: string[] = ['ko', 'papir', 'ollo'];
  animationPhase: 'moving' | 'showing-loser' | 'resetting' = 'moving';
  gameStarted: boolean = false;
  gameEnded: boolean = false;
  opponentChosen: boolean = false;
  debug: boolean;
  isPlayer: boolean;
  isSpectator: boolean;
  countdown: number = 3;
  roundTimer: number = 0;
  selectedRound: number = 0;
  currentRound: number = 0;
  youWon: boolean = false;
  drawCount: number;
  playerScore: number;
  opponentScore: number;
  requiredWins: number;
  roundLength: number;
  timerInterval: any;
  cyclingInterval: any;
  showCycle: boolean = true;
  countDownShown: boolean = false;
  protected otherPlayerRequired: number;
  protected PlayerRequired: number;
  protected otherPlayerName: string;
  protected userName: string;
  protected requiredWinsArray: number[];
  private aiChoiceExecuted: boolean = false;
  private aiChoiceTimer: any = null;
  private cyclingSubscription: Subscription;
  private cycleStartTime: number;
  private playMusic: boolean;
  private playOnce: boolean = true;
  private winnerTimeout: any;

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
    private rpsService: RpsService,
    private tracker: SubscriptionTrackerService,
    private authService: AuthService,
    private firestore: AngularFirestore,
    private router: Router,
    protected languageService: LanguageService,
    private renderer: Renderer2,
    private audioService: AudioService,
    private endGameService: EndGameService,
  ) {
    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }

  //TODO: for later :) Ha a felhasználónak nincs megnyitva az oldal és közben letelik a kör akkor utánna problémák lehetnek
  canChoose: boolean = true;


  async ngOnInit() {
    this.debug = localStorage.getItem('debug') === 'true';

    this.authService.getUserData().pipe(
      take(1)
    ).subscribe(user => {
      this.currentUser = user;

      const rpsSubscription = this.rpsService.getGameState(this.lobbyId)
        .pipe(
          filter(game => !!game),
          distinctUntilChanged(),
          debounceTime(1)
        )
        .subscribe({
          next: async game => {
            this.game = game;

            if (this.game.winner != null) {
              this.gameStarted = true;
              this.countDownShown = true;
            }

            if (!this.gameStarted) {
              this.startInitialCountdown();
            }


            this.isPlayer = this.game.players.includes(this.currentUser.id);
            this.isSpectator = this.game.spectators.includes(this.currentUser.id);
            await this.redirectPlayer()

            this.winner = this.game.winner;
            this.otherPlayerId = this.game.players.filter((_ele: any, idx: any) => idx !== this.game.players.indexOf(this.currentUser.id))[0];
            this.rounds = this.getRounds();
            this.roundLength = this.game.gameModifiers?.timed ?? 0;
            this.game.startedAt = game.startedAt.toDate()
            this.roundTimer = this.calculateRemainingTimeAtStart(this.game.startedAt, this.roundLength);


            if (this.game.status === 'ended' || this.game.winner !== null) {
              this.gameEnded = true;
              rpsSubscription.unsubscribe();
              return;
            }


            if (this.game && this.isPlayer) {
              if (this.aiChoiceTimer) {
                clearTimeout(this.aiChoiceTimer);
                this.aiChoiceTimer = null;
              }
              this.aiChoiceExecuted = false;

              if (this.otherPlayerId.includes('#') && this.game.winner == null && !this.aiChoiceExecuted) {
                const baseDelay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 3000;

                this.aiChoiceTimer = setTimeout(() => {
                  if (!this.aiChoiceExecuted && !this.opponentChoice) {
                    if (this.otherPlayerId.includes('#') && this.game.winner == null && !this.aiChoiceExecuted) {
                      const randomIndex = Math.floor(Math.random() * 3);
                      const chosenChoice = this.choices[randomIndex];
                      this.makeAIChoice(chosenChoice, this.otherPlayerId);
                      this.aiChoiceExecuted = true;
                    }
                  }
                }, baseDelay);
              }

              this.currentRound = this.game.currentRound;
              const currentRoundData = this.game.rounds?.[this.currentRound];

              this.drawCount = Object.values(this.game.rounds).filter((round: any) => round.winner === "draw").length;
              this.requiredWins = Math.ceil((this.game.bestOfRounds + 1) / 2);

              this.updateDrawCount();
              this.updatePlayerScores();
              this.canChoose = true;

              this.requiredWinsArray = this.getScoreCircles(this.requiredWins);
              this.otherPlayerRequired = this.getRemainingWins(this.otherPlayerId);
              this.PlayerRequired = this.getRemainingWins(this.currentUser.id);
              this.otherPlayerName = this.getPlayerName(this.otherPlayerId);
              this.userName = this.getPlayerName(this.currentUser.id);


              if (this.selectedRound <= this.currentRound) {
                if (this.currentRound >= 1) {
                  this.roundTimer = this.calculateRemainingTimeMidRound(this.game.rounds?.[this.currentRound - 1], this.roundLength);
                  await this.startRoundTimer();
                }

              }

              this.updateDrawCount();
              this.updatePlayerScores();


              if (currentRoundData != null) {
                this.playerChoice = currentRoundData.choices?.[this.currentUser.id]?.choice || null;
                this.opponentChoice = currentRoundData.choices?.[this.otherPlayerId]?.choice || null;

                if (this.opponentChoice !== null && this.playerChoice === null) {
                  this.opponentChosen = true;
                  this.startChoiceCycling();
                }


                if (currentRoundData.winner && this.winnerTimeout) {
                  clearTimeout(this.winnerTimeout);
                  this.winnerTimeout = null;
                  this.canChoose = true;
                }
                const allPlayersChosen = currentRoundData.choices[this.currentUser.id] != null && currentRoundData.choices[this.otherPlayerId] != null;

                if (allPlayersChosen && !this.gameEnded) {
                  if (this.game.ownerId === this.currentUser.id) {
                    await this.determineWinner(this.game);
                  } else {

                    if (!this.winnerTimeout) {
                      this.canChoose = false;
                      this.winnerTimeout = setTimeout(async () => {
                        this.canChoose = true;
                        if (currentRoundData && !currentRoundData.winner) {
                          await this.determineWinner(this.game);
                        }
                        this.winnerTimeout = null;
                      }, 3000);
                    }
                  }
                }
                await this.evaluateRound();
                await this.handleAnimations();
              }
            }
          },
          error: err => console.error('Game state error: ', err)
        });
      this.tracker.add(this.CATEGORY, "getGameAndUserSub", rpsSubscription);
    });
  }

  calculateRemainingTimeMidRound(currentRoundData: any, roundDuration: number): number {

    if (!currentRoundData?.choices || roundDuration <= 0) {
      return 0;
    }
    let latestTimestamp: any = 0;

    for (const playerId in currentRoundData.choices) {
      const choice = currentRoundData.choices[playerId];
      if (choice?.timestamp) {
        const choiceDate = choice.timestamp.toDate();
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

  async startRoundTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(async () => {
      if (this.roundTimer > 0) {
        this.roundTimer--;
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  startInitialCountdown() {
    this.gameStarted = false;
    const countdownInterval = setInterval(() => {
      if (this.countdown > 1) {
        this.countdown--;
      } else {
        this.countDownShown = true;
        clearInterval(countdownInterval);
        this.gameStarted = true;
        if (this.currentRound === 0) {
          this.startRoundTimer().then();
        }
      }
    }, 1000);
  }

  makeChoice(choice: string) {
    if (!this.playerChoice && this.currentUser) {
      this.playerChoice = choice;
      this.rpsService.makeChoice(this.lobbyId, choice, this.currentUser.id, this.currentRound);
    }
  }

  makeAIChoice(choice: string, AIId: string) {
    if (!this.opponentChoice && this.currentUser) {
      this.rpsService.makeChoice(this.lobbyId, choice, AIId, this.currentRound);
    }
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
    if (this.cyclingInterval) {
      clearInterval(this.cyclingInterval);
    }
    this.audioService.stopAllSounds()
    this.stopChoiceCycling();
  }

  getRemainingWins(playerId: string): number {
    if (!this.game || !this.game.rounds) {
      return -1;
    }

    const playerWins = Object.values(this.game.rounds).filter((round: any) => round.winner === playerId).length;
    return this.requiredWins - playerWins
  }

  getPlayerName(playerId: string): string {
    const index = this.game.players.indexOf(playerId);
    return index !== -1 ? this.game.playerNames[index] : `${this.languageService.translate("UNKNOWN_PLAYER")}: (${playerId})`;
  }

  getScoreCircles(requiredWins: number): number[] {
    return Array(requiredWins).fill(0);
  }

  calculateRemainingTimeAtStart(startedAt: Date, roundDuration: number) {
    const now = new Date().getTime();
    const startTime = new Date(startedAt).getTime() + 5000;
    const endTime = startTime + roundDuration * 1000;
    return Math.max(0, Math.floor((endTime - now) / 1000));
  };

  private updateDrawCount(): void {
    if (this.game?.rounds) {
      this.drawCount = Object.values(this.game.rounds).filter(
        (round: any) => round.winner === "draw"
      ).length;
    }
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
      update.status = "ended"
      update.endedAt = new Date();
      update.winner = potentialWinner;
      update.endReason = 'Someone Won';
      update.gameEnded = true;
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
    if (!gameData.rounds[currentRound]) {
      return;
    }
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

  private async endGame() {
    try {
      await this.endGameService.endLobby(this.lobbyId, this.winner, this.endReason, this.game);
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

    this.playerScore = Object.values(this.game.rounds)
      .filter((round: any) => round.winner === this.currentUser.id).length;
    this.opponentScore = Object.values(this.game.rounds)
      .filter((round: any) => round.winner === this.otherPlayerId).length;
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
    this.positionSprite()
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.animationPhase = 'resetting';
    this.resetPlayersChoice();

  }

  private positionSprite() {

    if (this.losingChoice && this.animationPhase === 'showing-loser') {
      if (this.playMusic && this.playOnce) {
        this.playOnce = false;
        this.audioService.playSoundByName("explosion.wav");
      }
      setTimeout(() => {
        const sprite = document.querySelector('.loser-sprite') as HTMLElement;
        const loserElementType = this.youWon ? 'opponent' : 'player';
        const loserElement = document.querySelector(`.${loserElementType}-choice`) as HTMLElement;

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
      }, 1);
    }
  }

  private evaluateRound(): Promise<void> {
    if (!this.playerChoice || !this.opponentChoice) return;

    const matchup = `${this.playerChoice}:${this.opponentChoice}`;

    if (this.outcomeRules.winStates[matchup]) {
      this.animationState = this.outcomeRules.winStates[matchup];
      this.youWon = true;
      this.playMusic = true;
    } else if (this.outcomeRules.winStates[`${this.opponentChoice}:${this.playerChoice}`]) {
      this.animationState = this.outcomeRules.winStates[`${this.opponentChoice}:${this.playerChoice}`];
      this.youWon = false;
      this.playMusic = true;
    } else {
      this.animationState = this.outcomeRules.drawStates[this.playerChoice];
      this.youWon = null;
    }

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
    this.playOnce = true;
    this.playMusic = false;
    this.losingChoice = null;
    this.animationPhase = 'moving';
    this.selectedRound = this.currentRound;
    this.aiChoiceExecuted = false;
    this.showCycle = false;
    this.stopChoiceCycling();
  }

  private startChoiceCycling() {
    this.stopChoiceCycling();

    this.cycleStartTime = Date.now();

    this.cyclingSubscription = interval(50).subscribe(() => {
      const elapsed = Date.now() - this.cycleStartTime;
      if (elapsed >= 1150) {
        this.showCycle = false;

        setTimeout(() => {
          const currentIndex = this.choices.indexOf(this.currentCyclingChoice);
          const nextIndex = (currentIndex + 1) % this.choices.length;
          this.currentCyclingChoice = this.choices[nextIndex];
          this.showCycle = true;
        }, 50);

        this.cycleStartTime = Date.now();
      }
    });
  }

  private stopChoiceCycling() {
    if (this.cyclingSubscription) {
      this.cyclingSubscription.unsubscribe();
    }
  }

  async goToLobby() {
    await this.router.navigate(['/lobbies/']);
  }

  async goToWatchingReplay() {
    await this.router.navigate(['/lobbies/' + 'replays:' + this.lobbyId]);
  }

  roundsWon(): number {
    return this.rounds.filter(round => round.winner === this.currentUser.id).length;
  }

  roundsLost(): number {
    return this.rounds.filter(round => round.winner != this.currentUser.id && round.winner != null).length;
  }

  roundsDrawn(): number {
    return this.rounds.filter(round => round.winner === "draw").length;
  }

  totalRounds(): number {
    return this.rounds.length;
  }


  finalResult(): string {
    if (this.game.winner != null && this.game.winner === this.currentUser.id) {
      return this.languageService.translate('YOU_WON');
    }
    if (this.game.winner != null && this.game.winner === this.otherPlayerId) {
      return this.languageService.translate('YOU_LOST');
    }
    if (this.game.winner != null && this.game.winner === "#Drew") {
      return this.languageService.translate('DRAW');
    }

  }
}

