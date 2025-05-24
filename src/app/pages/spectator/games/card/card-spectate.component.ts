import {
  AfterViewInit,
  ChangeDetectorRef,
  Component, ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output, QueryList,
  Renderer2,
  SimpleChanges, ViewChild, ViewChildren
} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {SubscriptionTrackerService} from "../../../../shared/services/subscriptionTracker.service";
import {LanguageService} from "../../../../shared/services/language.service";
import {AudioService} from "../../../../shared/services/audio.service";
import {User} from "../../../../shared/models/user";
import {CardPlayer} from "../../../../shared/models/games/cardPlayer";
import {take} from "rxjs";
import {AuthService} from "../../../../shared/services/auth.service";
import {Card} from "../../../../shared/models/games/card.model";
import { PlayerAnimation } from 'src/app/shared/models/playerAnimation';

@Component({
  selector: 'app-card-spectate',
  templateUrl: './card-spectate.component.html',
  styleUrls: ['./card-spectate.component.scss'],
  animations: []
})

export class CardSpectateComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  private readonly CATEGORY: string = "cardSpectate";
  private readonly lobbyId: string;
  private nextPlayerId: string;
  private skipCount: number;
  private playerChoices2: {} = {};
  private currentPlayer2: CardPlayer;
  private direction: number = 1;
  private drawDeckIndex: number = 0;
  protected placements: string[] = [];
  protected players: CardPlayer[];
  protected drawPile: Card[];
  protected discardPile: Card[];
  protected currentPlayer: CardPlayer;
  protected pendingDraws: number = 0;
  protected debug: boolean = false;
  protected gameEnded: boolean = false;
  @Output() playingAnimations = new EventEmitter<boolean>();
  @Input() game!: any;
  @Input() currentUser: User;
  @Input() skipAnimations!: boolean;
  @Input() playerChoices: { [username: string]: string } = {};
  animations: { [playerId: string]: PlayerAnimation } = {};
  topCard = null;

  isMobile = false;

  @ViewChild('gridContainer') gridContainer!: ElementRef;
  @ViewChildren('cell') cells!: QueryList<ElementRef>;

  readonly POSITIONS = {
    2: [2,8],
    3: [3,4,8],
    4: [3,4,6,7],
    5: [2,3,4,6,8],
    6: [2,3,4,6,7,8],
    7: [2,3,4,6,7,8,9],
    8: [1,2,3,4,6,7,8,9]
  };

  protected rounds: {
    roundNumber: number;
    choices: { [player: string]: { choice: string; timestamp: Date } };
    winner: string | null
  }[];

  constructor(
    private route: ActivatedRoute,
    private tracker: SubscriptionTrackerService,
    private renderer: Renderer2,
    private languageService: LanguageService,
    private router: Router,
    private cdRef: ChangeDetectorRef,
    private audioService: AudioService,
    private authService: AuthService,
  ) {
    this.checkMobile();
    window.addEventListener('resize', () => {
      this.checkMobile();
      this.cdRef.detectChanges();
    });

    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }


  ngOnInit() {
    this.authService.getUserData().pipe(
      take(1)
    ).subscribe(user => {
      this.currentUser = user;
    });

    this.initgame();
  }


  initgame(){
    this.drawDeckIndex = 0;
    const deckHistoryCards: Card[] = this.game.deckHistory[this.drawDeckIndex]
      .split(',')
      .map((code: string) => code.trim())
      .filter((code: string) => code.length > 0)
      .map((code: string) => this.codeToCard(code));

    this.placements = [];

    const initialHandSize: number = 7;
    const totalInitialCards: number = initialHandSize * this.game.players.length;
    const remainingDeck: Card[] = deckHistoryCards.slice(totalInitialCards);

    this.players = this.game.players.map((id: any, index: number) => {
      const start: number = index * initialHandSize;
      const end: number = start + initialHandSize;
      return {
        id: id,
        name: this.game.playerNames[index],
        cards: deckHistoryCards.slice(start, end)
      };
    });

    for (let i = 0; i < remainingDeck.length; i++) {
      if (['0','1','2','3','4','5','6','7','8','9'].includes(remainingDeck[i].symbol)) {
        this.discardPile = [...remainingDeck.slice(i,i+1)];
        break;
      }
    }

    this.pendingDraws = 0;
    this.skipCount = 0;
    this.direction = 1;
    this.placements = [];
    this.drawPile = remainingDeck;
    this.currentPlayer = this.players[0];
    this.nextPlayerId = this.players[0].id;

    delete this.playerChoices2;

    this.gameEnded = this.game.status === 'ended' && this.placements.length +1 === this.game.players.length;
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.checkMobile);
    this.tracker.unsubscribeCategory(this.CATEGORY);
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
    return this.isMobile ? [5, ...activePositions] : [1,2,3,4,5,6,7,8,9];
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

  async ngOnChanges(changes: SimpleChanges) {
    if (changes && changes['playerChoices'] && changes['playerChoices'].currentValue && this.players) {
      if (changes['playerChoices']?.currentValue != null && Object.keys(changes['playerChoices'].currentValue).length !== 0) {


        this.currentPlayer2  = this.players.filter(player => player.id === this.nextPlayerId)[0];
        this.playerChoices2 = changes['playerChoices'].currentValue;
        this.skipCount = 1;
        const action = this.playerChoices2[this.currentPlayer2.name];

          // 1. KIJÁTSZOTT LAP KEZELÉSE
          if ((action as string).trim().startsWith('played-')) {
            const cardCode = (action as string).split('played-')[1].trim();

            const targetCard = {
              color: cardCode.split('_')[0],
              symbol: cardCode.split('_')[1],
              special: ['change', 'plus4'].includes(cardCode.split('_')[1]),
              id: 0
            };

            if(['plus2','plus4'].includes(targetCard.symbol)){
              if(targetCard.symbol === 'plus2'){
                this.pendingDraws += 2;
              } else {
                this.pendingDraws += 4;
              }
            }

            if(targetCard.symbol === 'reverse'){
              if (this.players.length - this.placements.length === 2) {
                this.skipCount = 2;
                this.direction *= -1;
              } else {
                this.direction *= -1;
              }
            }

            if(targetCard.symbol === 'skip'){
              this.skipCount = 2;
            }


            const cardIndex = this.currentPlayer2.cards.findIndex((c: { symbol: string; color: string; }) => {
              if (c.symbol === 'change' || c.symbol === 'plus4') {
                return c.symbol === targetCard.symbol;
              }
              return c.color === targetCard.color && c.symbol === targetCard.symbol;
            });

            if (cardIndex > -1) {
              const [playedCard] = this.currentPlayer2.cards.splice(cardIndex, 1);
              this.discardPile.unshift(playedCard);

              let playerId = this.currentPlayer2.id;

              if (!this.animations[playerId]) {
                this.animations[playerId] = {};
              }

              this.animations[playerId].playedCard = playedCard;

              setTimeout(() => {
                delete this.animations[playerId].playedCard;
              }, 800);


            }
          }

          // 2. LAPOK HÚZÁSA
          else if (typeof action === 'string' && action.trim().startsWith('drawn-')) {
            const drawnCardsRaw = action.split(',');

            const drawnCards: Card[] = drawnCardsRaw.map(code => {
              const cleanedCode = code.trim().replace('drawn-', ''); // pl. "drawn-R5" → "R5"
              return {
                color: cleanedCode.split('_')[0],
                symbol: cleanedCode.split('_')[1],
                special: ['change', 'plus4'].includes(cleanedCode.split('_')[1]),
                id: 0
              };
            });

            this.currentPlayer2.cards.push(...drawnCards);

            const drawnCount = drawnCards.length;

            if(this.drawPile.length < drawnCount){
              this.drawDeckIndex += 1;

              const deckHistoryCards: Card[] = this.game.deckHistory[this.drawDeckIndex]
                .split(',')
                .map((code: string) => code.trim())
                .filter((code: string | any[]) => code.length > 0)
                .map((code: string) => this.codeToCard(code));

              this.drawPile = [...deckHistoryCards];
              this.discardPile = [this.discardPile[0]]

            }

            let drawnId = this.currentPlayer2.id;

            if (!this.animations[drawnId]) {
              this.animations[drawnId] = {};
            }

            this.animations[drawnId].drawCount = drawnCards.length;

            setTimeout(() => {
              delete this.animations[drawnId].drawCount;
            }, 800);


            this.drawPile.splice(0, drawnCount);
            this.pendingDraws = null;
          }


        this.nextPlayerId = this.calculateNextPlayer(
          this.game.players,
          this.currentPlayer2.id,
          this.direction,
          this.skipCount,
          this.placements,
        );


        if(this.currentPlayer2.cards.length === 0) {
          this.placements.push(this.currentPlayer2.id);
        }


        if(this.currentPlayer2 && this.currentPlayer2.name && this.playerChoices2 && this.playerChoices2[this.currentPlayer2.name] )
        delete this.playerChoices2;
      }

      if(changes['playerChoices']?.currentValue != null && Object.keys(changes['playerChoices'].currentValue).length === 0){
        this.initgame();
      }
    }

  }

  async goToWatchingReplay() {
    await this.router.navigate(['/lobbies/' + 'replays:' + this.lobbyId]);
  }


  isCellActive(cell: number): boolean {
    return cell === 5 || this.shouldShowPlayer(cell);
  }

  isCurrentPlayer(player?: CardPlayer): boolean {
    return !!player &&
      player.id === this.game.currentPlayer;
  }

  shouldShowPlayer(cell: number): boolean {
    const positions = this.POSITIONS[this.players.length];
    return positions ? positions.includes(cell) : false;
  }


  getPlayerByCell(cell: number): CardPlayer | null {
    const positions = this.POSITIONS[this.players.length];
    if (!positions) return undefined;
    const index = positions.indexOf(cell);
    return index >= 0 ? this.players[index] : null;
  }


  private codeToCard(code: string): Card {

    const colorMap: {[key: string]: string} = {
      'R': 'red', 'B': 'blue', 'G': 'green',
      'Y': 'yellow', 'W': 'black'
    };

    const symbolMap: {[key: string]: string} = {
      'S': 'skip', 'R': 'reverse', 'K': 'plus2',
      'C': 'change', 'P': 'plus4'
    };

    if (code.startsWith('W')) {
      return {
        color: 'black',
        symbol: code === 'WP' ? 'plus4' : 'change',
        special: true,
        id: 0,
      };
    }


    const color = colorMap[code[0]] || 'black';
    const symbolCode = code.slice(1).toUpperCase();

    let symbol = symbolMap[symbolCode] || symbolCode.toLowerCase();

    if (symbol === 'K') symbol = 'plus2';

    return {
      color: color,
      symbol: symbol,
      special: false,
      id: 0
    };
  }

  private calculateNextPlayer(
    allPlayers: string[],
    currentPlayer: string,
    direction: number,
    skipCount: number,
    placements: string[]
  ): string {

    const activePlayers = allPlayers.filter(p => !placements.includes(p));
    const currentIndex = activePlayers.indexOf(currentPlayer);
    const nextIndex = (currentIndex + (direction*skipCount) + activePlayers.length) % activePlayers.length;

    return activePlayers[nextIndex];
  }
}
