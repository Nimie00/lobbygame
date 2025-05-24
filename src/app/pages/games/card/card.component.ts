import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  Renderer2,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {AuthService} from "../../../shared/services/auth.service";
import {debounceTime, filter} from "rxjs/operators";
import {LanguageService} from "../../../shared/services/language.service";
import {CARDGame} from "../../../shared/models/games/games.card.gameplaydata.model";
import {User} from "../../../shared/models/user";
import {distinctUntilChanged, Subscription, take} from "rxjs";
import {AudioService} from "../../../shared/services/audio.service";
import {CardService} from "../../../shared/services/game-services/card.service";
import {CardPlayer} from "../../../shared/models/games/cardPlayer";
import {Card} from "../../../shared/models/games/card.model";
import {AlertService} from "../../../shared/services/alert.service";
import {PlayerAnimation} from "../../../shared/models/playerAnimation";


@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  animations: []
})


export class CardComponent implements OnInit, OnDestroy, AfterViewInit {
  private CATEGORY: string = "card-game"
  game: CARDGame;
  currentUser: User;
  lobbyId: string;
  winner: string = null;
  debug: boolean;
  currentRound: number = 0;
  players: CardPlayer[] = [];
  drawPile: any[] = [];
  discardPile: any[] = [];
  currentPlayerIndex: number = 0;
  direction: number = 1;
  cardSubscription: Subscription;
  placements: string[];
  protected gameEnded: boolean;
  isMobile = false;
  @ViewChild('gridContainer') gridContainer!: ElementRef;
  @ViewChildren('cell') cells!: QueryList<ElementRef>;

  totalPlus4s = 0;
  totalRounds = 0;
  maxDrawnInRound = 0;
  gameDuration = '';


  readonly POSITIONS = {
    2: [2, 8],
    3: [3, 4, 8],
    4: [3, 4, 6, 7],
    5: [2, 3, 4, 6, 8],
    6: [2, 3, 4, 6, 7, 8],
    7: [2, 3, 4, 6, 7, 8, 9],
    8: [1, 2, 3, 4, 6, 7, 8, 9]
  };
  animations: { [playerId: string]: PlayerAnimation } = {};


  constructor(
    private route: ActivatedRoute,
    private cardService: CardService,
    private router: Router,
    private renderer: Renderer2,
    private tracker: SubscriptionTrackerService,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef,
    private audioService: AudioService,
    protected languageService: LanguageService,
    private AlertService: AlertService,
  ) {
    this.checkMobile();
    window.addEventListener('resize', () => {
      this.checkMobile();
      this.cdRef.detectChanges();
    });
    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }


  async ngOnInit() {
    this.debug = localStorage.getItem('debug') === 'true';

    this.authService.getUserData().pipe(
      take(1)
    ).subscribe(user => {
      this.currentUser = user;

      this.cardSubscription = this.cardService.getGameState(this.lobbyId)
        .pipe(
          filter(game => !!game),
          distinctUntilChanged(),
          debounceTime(1)
        )
        .subscribe({
          next: async (game: CARDGame) => {
            this.game = game;
            this.placements = game.placements;
            this.gameEnded = (game.players.length - (game.placements?.length || 0)) <= 1;
            this.initializeGame();
            if (this.game.hasBots && this.game.currentPlayer.includes('#') && !this.gameEnded) {
              if (this.currentUser.id === this.game.ownerId) {
                await this.handleBotActions(this.game.currentPlayer);
              }
            }
            if (this.gameEnded) {
              this.calculateStats();
            }
          },
          error: err => console.error('Game state error: ', err)
        });
      this.tracker.add(this.CATEGORY, "getGameAndUserSub", this.cardSubscription);
    });

  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
    this.audioService.stopAllSounds()
    window.removeEventListener('resize', this.checkMobile);

  }

  ngAfterViewInit() {
    this.cells.forEach((cell, index) => {
      const position = this.displayedPositions[index];
      const color = this.getPlayerColor(position);
      cell.nativeElement.style.setProperty('--player-color', color);
    });
  }

  getPlayerColor(position: number): string {
    const player = this.getPlayerByCell(position);
    if (!player) return '';

    const playerIndex = this.players.findIndex(p => p.id === player.id);
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--player${playerIndex + 1}-color`).trim() || '';
  }


  get displayedPositions(): number[] {
    const activePositions = this.POSITIONS[this.players.length] || [];
    return this.isMobile ? [5, ...activePositions] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }

  getGridRow(position: number): string {
    const row = Math.ceil(position / 3);
    return `${row} / ${row + 1}`;
  }

  getGridColumn(position: number): string {
    const col = (position - 1) % 3 + 1;
    return `${col} / ${col + 1}`;
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768; // Standard mobil breakpoint
  }

  private initializeGame() {

    this.players = this.game.players.map((id, index) => ({
      id: id,
      name: this.game!.playerNames[index],
      cards: this.game!.hands[id] || []
    }));

    this.drawPile = [...this.game.deck];
    this.discardPile = [...this.game.discardPile].reverse();

    this.currentPlayerIndex = this.game.players.indexOf(this.game.currentPlayer);
  }

  get currentPlayer(): CardPlayer {
    return this.players[this.currentPlayerIndex];
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isMobile) {
      const container = this.gridContainer.nativeElement;
      const viewportHeight = window.innerHeight;
      container.style.height = `${viewportHeight - 100}px`;
    }
  }

  calculateStats() {
    const plus4Key = ['played-red_plus4', 'played-yellow_plus4', 'played-blue_plus4', 'played-green_plus4'];

    const roundsArray = Object.values(this.game.rounds);
    this.totalRounds = roundsArray.length;

    let maxDrawn = 0;
    let plus4Count = 0;

    for (const round of roundsArray) {
      const choiceEntries = Object.values(round.choices);
      const entries = Object.values(round.choices);

      const allChoices = entries.flatMap(e =>
        Array.isArray(e.choice) ? e.choice : [e.choice]
      );

      const drawsThisRound = allChoices.filter(c => c.startsWith('drawn-')).length;
      maxDrawn = Math.max(maxDrawn, drawsThisRound);


      plus4Count += choiceEntries
        .filter(c => plus4Key.includes(c.choice))
        .length;
    }

    this.maxDrawnInRound = maxDrawn;
    this.totalPlus4s = plus4Count;

    const startTs = this.game.startedAt as any
    const endTs = this.game.endedAt as any

    const startDate = startTs.toDate();
    const endDate = endTs.toDate();

    let diffMs = endDate.getTime() - startDate.getTime();

    const msYear = 1000 * 60 * 60 * 24 * 365;
    const years = Math.floor(diffMs / msYear);
    diffMs -= years * msYear;

    const msDay = 1000 * 60 * 60 * 24;
    const days = Math.floor(diffMs / msDay);
    diffMs -= days * msDay;

    const msHour = 1000 * 60 * 60;
    const hours = Math.floor(diffMs / msHour);
    diffMs -= hours * msHour;

    const msMin = 1000 * 60;
    const mins = Math.floor(diffMs / msMin);
    diffMs -= mins * msMin;

    const secs = Math.floor(diffMs / 1000);

    this.gameDuration =
      hours + ' : ' +
      mins + ' : ' +
      secs;
  }

  async onDrawCard(playerId: string) {
    if (this.isCurrentPlayer && this.drawPile.length > 0) {
      const card = this.drawPile.shift();
      if (card) {
        this.currentPlayer.cards.push(card);
        this.nextPlayer();
        try {
          if (!this.animations[playerId]) {
            this.animations[playerId] = {};
          }
          this.animations[playerId].drawCount = Math.max(this.game.gameModifiers?.pendingDraws, 1);
          setTimeout(() => {
            delete this.animations[playerId].drawCount;
          }, 800);

          await this.cardService.drawCard(this.lobbyId, playerId);
        } catch (error) {
          this.showError(error.message);
        }
      }
    }
  }

  async onPlayCard(cardIndex: number, playerId: string) {
    if (this.isCurrentPlayer) {
      const playedCard = this.currentPlayer.cards.splice(cardIndex, 1)[0];
      let selectedColor = playedCard.color;
      if (['change', 'plus4'].includes(playedCard.symbol) && !playerId.includes('#')) {
        try {
          selectedColor = await this.AlertService.showColorPicker();
        } catch (error) {
          this.showError("Válassz színt a kártyához!");
          return;
        }
      }
      if (this.isValidPlay(playedCard)) {
        this.discardPile.unshift(playedCard);
        this.nextPlayer();

        if (playerId.includes('#')) {
          selectedColor = this.determineBestColor(playerId)
        }

        try {
          if (!this.animations[playerId]) {
            this.animations[playerId] = {};
          }

          this.animations[playerId].playedCard = playedCard;

          setTimeout(() => {
            delete this.animations[playerId].playedCard;
          }, 800);

          await this.cardService.playCard(
            this.lobbyId, playerId, cardIndex, selectedColor);
          selectedColor = null;
        } catch (error) {
          this.showError(error.message);
        }
      } else {
        this.showError("Card not playable");
      }
    }
  }

  private nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
  }

  isCurrentPlayer(player?: CardPlayer): boolean {
    return !!player &&
      player.id === this.game.currentPlayer;
  }

  isCellActive(cell: number): boolean {
    return cell === 5 || this.shouldShowPlayer(cell);
  }

  shouldShowPlayer(position: number): boolean {
    const positions = this.POSITIONS[this.players.length];
    const player: CardPlayer = this.players[positions.indexOf(position)];
    return position !== 5 && !!player;
  }

  getPlayerByCell(cell: number): CardPlayer | undefined {
    const positions = this.POSITIONS[this.players.length];
    if (!positions) return undefined;
    const index = positions.indexOf(cell);
    return index >= 0 ? this.players[index] : undefined;
  }

  private showError(message) {
    console.error(message);
  }

  private isValidPlay(playedCard: Card): boolean {
    const pending = this.game.gameModifiers?.pendingDraws;
    const topCard = this.discardPile[this.discardPile.length - 1];
    if (pending > 0) {
      return topCard
        && (playedCard.symbol === 'plus4'
          || (topCard.symbol === 'plus4' && playedCard.symbol === 'plus2' && playedCard.color === topCard.color)
          || (topCard.symbol === 'plus2' && playedCard.symbol === 'plus2'));
    }

    return !topCard ||
      playedCard.color === topCard.color ||
      playedCard.symbol === topCard.symbol ||
      ['change', 'plus4'].includes(playedCard.symbol);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleBotActions(botId: string) {
    if (this.game.currentPlayer.includes('#')) {
      const baseDelay = Math.floor(Math.random() * (600 - 16 + 10)) + 1000;

      await this.delay(baseDelay);

      let hand: Card[] = this.game.hands[this.game.currentPlayer];
      let maxEffectiveness = -Infinity;
      let selectedCardIndex = -1;
      let decidedAction: string = "draw";


      hand.forEach((card, index) => {
        const effectiveness = this.calculateEffectiveness(card, botId);

        if (effectiveness > maxEffectiveness) {
          maxEffectiveness = effectiveness;
          selectedCardIndex = index;
        }

        if (effectiveness > 0) {
          decidedAction = "play";
        }
      });

      if (maxEffectiveness <= 0) {
        selectedCardIndex = -1;
        decidedAction = "draw";
      }

      if (decidedAction === "play" && selectedCardIndex !== -1) {
        await this.onPlayCard(selectedCardIndex, botId);
      } else {
        await this.onDrawCard(botId);
      }
    }
  }

  private calculateEffectiveness(card: Card, botId: string): number {
    const filteredPlayers: string[] = this.game.players.filter(player => !this.game.placements.includes(player));
    const currentIndex: number = filteredPlayers.indexOf(botId);
    const nextIndex: number = (currentIndex + 1) % filteredPlayers.length;
    const nextPlayer: string = filteredPlayers[nextIndex];
    const botsOwnHand: Card[] = this.game.hands[botId];

    const pendingDraws = this.game.gameModifiers.pendingDraws || 0;
    const currentPlayerHand: Card[] = this.game.hands[this.game.currentPlayer];
    const nextPlayerHandSize: number = this.game.hands[nextPlayer].length;
    const topCard = this.discardPile[this.discardPile.length - 1];

    const isPlayable = this.isCardPlayable(card, topCard, pendingDraws);
    if (!isPlayable) return -100;

    let effectiveness = 0;

    if (pendingDraws > 0) {
      return this.handlePendingDrawsCase(card, nextPlayerHandSize);
    }

    switch (card.symbol) {
      case 'plus2':
        effectiveness = 2.0 + (nextPlayerHandSize * 0.15);
        break;
      case 'change':
      case 'plus4': {
        const chosenColor: string = this.determineBestColor(botId);
        effectiveness = 2.0 + (botsOwnHand.filter(c => c.color === chosenColor).length * 0.3);
        break;
      }
      case 'skip':
        effectiveness = 1.8 - (currentPlayerHand.length * 0.1);
        break;
      case 'reverse':
        effectiveness = 1.5 + (this.game.players.length * 0.1);
        break;
      default:
        effectiveness = this.handleNumberCard(card, nextPlayerHandSize);
    }

    if (card.color === 'black') {
      effectiveness -= (7 - currentPlayerHand.length) * 0.15;
    } else {
      effectiveness += this.getColorAdvantage(card.color, nextPlayer);
    }

    return Math.round(effectiveness * 100) / 100;
  }

  private isCardPlayable(card: Card, topCard: Card, pendingDraws: number): boolean {
    if (pendingDraws > 0) {
      if ('plus4' === card.symbol) {
        return true
      } else {
        return card.symbol === 'plus2' && topCard.color === card.color;
      }
    }
    return card.color === 'black' || (card.color === topCard.color || card.symbol === topCard.symbol);
  }

  private handlePendingDrawsCase(card: Card, nextPlayerHandSize: number): number {
    const baseValue: number = card.symbol === 'plus4' ? 23 : 30;
    return baseValue + (nextPlayerHandSize * 0.25);
  }

  private determineBestColor(botId: string): string {
    const ownHand = this.game.hands[botId];
    const discardColor = this.discardPile[0]?.color;

    const colorStats = ownHand.reduce((acc, card) => {
      if (card.color !== 'black') {
        acc[card.color] = (acc[card.color] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const colorScores: Record<string, number> = {};

    ['red', 'blue', 'green', 'yellow'].forEach(color => {
      let score = colorStats[color] || 0;

      if (color === discardColor) {
        score += 2;
      }

      if (ownHand.length < 3) {
        score += colorStats[color] * 0.5;
      }

      colorScores[color] = score;
    });

    if (Object.values(colorScores).every(s => s === 0)) {
      return discardColor || 'red';
    }

    return Object.entries(colorScores).reduce(
      (best, [color, score]) => score > best[1] ? [color, score] : best,
      ['red', -Infinity]
    )[0];
  }

  private handleNumberCard(card: Card, nextPlayerHandSize: number): number {
    const numberValue = parseInt(card.symbol, 10);
    return 1.0 +
      (numberValue * 0.15) -
      (nextPlayerHandSize * 0.05);
  }

  private getColorAdvantage(color: string, playerId: string): number {
    const colorCount = this.game.hands[playerId]
      .filter(c => c.color === color).length;
    return (5 - colorCount) * 0.1;
  }

  calculatePlacement() {
    let number = this.placements.indexOf(this.currentUser.id) + 1;
    if (number === 0) {
      number = this.placements.length + 1;
    }
    return number;
  }


  async goToLobby() {
    await this.router.navigate(['/lobbies/']);
  }

  async goToWatchingReplay() {
    await this.router.navigate(['/lobbies/' + 'replays:' + this.lobbyId]);
  }

}

