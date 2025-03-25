import {Component, OnDestroy, OnInit, Renderer2} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {AuthService} from "../../../shared/services/auth.service";
import {debounceTime, filter} from "rxjs/operators";
import {LanguageService} from "../../../shared/services/language.service";
import {CARDGame} from "../../../shared/models/games/games.card.gameplaydata.model";
import {User} from "../../../shared/models/user.model";
import {distinctUntilChanged, Subscription, take} from "rxjs";
import {AudioService} from "../../../shared/services/audio.service";
import {CardService} from "../../../shared/services/game-services/card.service";
import {CardPlayer} from "../../../shared/models/games/cardPlayer";
import {Card} from "../../../shared/models/games/card.model";
import {AlertService} from "../../../shared/services/alert.service";


@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  animations: []
})

//TODO: Ha már csak 1 játékos van aki még nem nyert akkor legyen vége a játéknak és legyen egy végső képernyő.
//TODO: Az AI játékos megvalósítása
//TODO: Befejező képernyő megvalósítása (itt lehetne az, hogy az emberek ablakaiban megjelenik a helyezésük)

//TODO: AI SZÍN VÁLASZTÁS


export class CardComponent implements OnInit, OnDestroy {
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


  readonly POSITIONS = {
    2: [2,8],
    3: [3,4,8],
    4: [3,4,6,7],
    5: [2,3,4,6,8],
    6: [2,3,4,6,7,8],
    7: [2,3,4,6,7,8,9],
    8: [1,2,3,4,6,7,8,9]
  };




  constructor(
    private route: ActivatedRoute,
    private cardService: CardService,
    private router: Router,
    private renderer: Renderer2,
    private tracker: SubscriptionTrackerService,
    private authService: AuthService,

    private audioService: AudioService,
    protected languageService: LanguageService,
    private AlertService: AlertService,

  ) {
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
          },
          error: err => console.error('Game state error: ', err)
        });
      this.tracker.add(this.CATEGORY, "getGameAndUserSub", this.cardSubscription);
    });
  }

  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
    this.audioService.stopAllSounds()
  }

  private initializeGame() {
    if (!this.game) return;

    this.players = this.game.players.map((id, index) => ({
      id:id,
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

  async onDrawCard(id: string) {
    if (this.isCurrentPlayer && this.drawPile.length > 0) {
      const card = this.drawPile.shift();
      if (card) {
        this.currentPlayer.cards.push(card);
        this.updateGameState();
        this.nextPlayer();
        try {
          await this.cardService.drawCard(this.lobbyId, id);
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
        this.updateGameState();
        this.nextPlayer();

        if(playerId.includes('#')) {
          selectedColor = this.determineBestColor(playerId)
        }

        try {
          console.log("ID:", playerId);
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

  private updateGameState() {

  }

  private nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
  }

  isCurrentPlayer(player?: CardPlayer): boolean {
    return !!player &&
      player.id === this.game.currentPlayer;
  }

  shouldShowPlayer(cell: number): boolean {
    const positions = this.POSITIONS[this.players.length];
    return positions ? positions.includes(cell) : false;
  }

  isCellActive(cell: number): boolean {
    return cell === 5 || this.shouldShowPlayer(cell);
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
      return topCard && ['plus2', 'plus4'].includes(playedCard.symbol);
    }

    return !topCard ||
      playedCard.color === topCard.color ||
      playedCard.symbol === topCard.symbol ||
      ['change', 'plus4'].includes(playedCard.symbol);
  }

  private async handleBotActions(botId: string) {
    if(this.game.currentPlayer.includes('#')) {
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
    const ownHand = this.game.hands[botId];

    const pendingDraws = this.game.gameModifiers.pendingDraws || 0;
    const currentPlayerHand = this.game.hands[this.game.currentPlayer];
    const nextPlayerHand = this.game.hands[nextPlayer];
    const topCard = this.discardPile[this.discardPile.length - 1];

    const isPlayable = this.isCardPlayable(card, topCard, pendingDraws);
    if (!isPlayable) return -1;

    let effectiveness = 0;

    if (pendingDraws > 0) {
      return this.handlePendingDrawsCase(card, nextPlayerHand.length);
    }

    switch(card.symbol) {
      case 'plus2':
        console.log("plus2");
        effectiveness = 2.0 + (nextPlayerHand.length * 0.15);
        break;
      case 'change':
      case 'plus4': {
        const chosenColor = this.determineBestColor(botId);
        effectiveness = 2.0 + (ownHand.filter(c => c.color === chosenColor).length * 0.3);
        break;
      }
      case 'skip':
        console.log("skip");
        effectiveness = 1.8 - (currentPlayerHand.length * 0.1);
        break;
      case 'reverse':
        console.log("reverse");
        effectiveness = 1.5 + (this.game.players.length * 0.1);
        break;
      default:
        console.log("numberCard");
        effectiveness = this.handleNumberCard(card, nextPlayerHand.length);
    }

    if (card.color === 'black') {
      effectiveness -= (7 - currentPlayerHand.length) * 0.15;
    } else {
      effectiveness += this.getColorAdvantage(card.color, nextPlayer);
    }

    return Math.round(effectiveness * 100) / 100; // 2 tizedes pontosság
  }

  private isCardPlayable(card: Card, topCard: Card, pendingDraws: number): boolean {
    if (pendingDraws > 0){
      if('plus4' === card.symbol){
        return true
      } else {
        return card.symbol === 'plus2' && topCard.color === card.color;
      }
    }


    return card.color === 'black' ||
      card.color === topCard.color ||
      card.symbol === topCard.symbol;
  }

  private handlePendingDrawsCase(card: Card, nextPlayerHandSize: number): number {
    const baseValue = card.symbol === 'plus4' ? 3.0 : 2.5;
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

}
