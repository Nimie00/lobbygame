import {Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild} from "@angular/core";
import {CardPlayer} from "../../../../shared/models/games/cardPlayer";
import {User} from "../../../../shared/models/user.model";
import {play} from "ionicons/icons";
import {Card} from "../../../../shared/models/games/card.model";
import {ActivatedRoute} from "@angular/router";
@Component({
  selector: 'app-player-hand',
  template: `
    <ng-container *ngIf="!gameEnded && player" [class.current]="isCurrent" >
    <div class="full-height">
      <ion-label>{{player.name}} - {{"NUMBER_OF_CARDS" | language}}: {{player.cards.length}}</ion-label>
      <div class="cards-container">
        <div class="cards-scroll-wrapper" [class.has-scroll]="needsScroll"
             (mousedown)="startDrag($event)"
              #cardsScrollWrapper>
          <div class="cards" [class.overflowing]="isOverflowing">
          <div
            *ngFor="let card of player.cards; let i = index"
            (click)="handleCardClick(i, $event)"
            [ngClass]=" currentUser.id === player.id ? 'yourcard' : 'notyourcard' "
            [class.selected]="selectedCardIndex === i"
            class="card-wrapper">
            <img
              *ngIf="currentUser.id === player.id || spectate"
              [ngSrc]= "'assets/cards/'+card.color+'_'+card.symbol+'.png'"
              height="80"
              width="40"
              class="card"
              [class.plus] = "['plus2', 'plus4'].includes(card.symbol) && PlusDraws "
              alt="{{card.color+'_'+card.symbol}}" />
            <img
              *ngIf="currentUser.id !== player.id && !spectate"
              [ngSrc]="'assets/cards/background.png'"
              height="80"
              width="40"
              class="card"
              alt="{{ 'UNKNOWN_CARD' | language }}" />
          </div>
            <div class="scroll-spacer"></div>
        </div>
          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
    </ng-container>
    <ng-container *ngIf="gameEnded">
      <div>
        <p>ended</p>
        <h3>{{player?.name}}</h3>
        <h5>Placement: {{calculatePlacement()}}</h5>
      </div>
    </ng-container>
  `,
  styleUrls: ['./player-hands.component.scss'],
})
export class PlayerHandComponent implements OnInit{
  @ViewChild('cardsScrollWrapper') cardsScrollWrapper: ElementRef;
  @ViewChild('card') cardImage: ElementRef;
  @Input() currentUser: User;
  @Input() player: CardPlayer;
  @Input() isCurrent?: boolean = false;
  @Input() discardPileTopCard?: Card;
  @Input() PlusDraws?: boolean;
  @Input() gameEnded?: boolean;
  @Input() placements?: string[];
  @Output() playCard?: EventEmitter<number> = new EventEmitter<number>();
  protected readonly play = play;
  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;
  private globalListeners: (() => void)[] = [];
  private moveThreshold = 5; // Pixelekben


  constructor(private route: ActivatedRoute,
             ) {}


  selectedCardIndex: number | null = null;
  errorMessage: string = '';
  spectate: boolean;


  ngOnInit() {
    this.spectate = this.route.snapshot.url.map(segment => segment.path).join('/').includes('spectate');
  }


  startDrag(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (target.tagName === 'IMG') {
      event.preventDefault();
      return;
    }

    const wrapper = this.cardsScrollWrapper.nativeElement;
    this.startX = event.clientX;
    this.scrollLeft = wrapper.scrollLeft;

    const moveListener = (e: MouseEvent) => {
      if (Math.abs(e.clientX - this.startX) > this.moveThreshold) {
        this.beginDrag(e);
      }
    };

    const upListener = () => {
      this.endDrag();
    };

    document.addEventListener('mousemove', moveListener);
    document.addEventListener('mouseup', upListener);

    this.globalListeners.push(
      () => document.removeEventListener('mousemove', moveListener),
      () => document.removeEventListener('mouseup', upListener)
    );
  }

  duringDrag(event: MouseEvent) {
    if (!this.isDragging) return;
    event.preventDefault();
    const wrapper = this.cardsScrollWrapper.nativeElement;
    const delta = event.clientX - this.startX;
    const sensitivity = 1.5;

    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
    const newScroll = this.scrollLeft - delta * sensitivity;

    wrapper.scrollLeft = Math.max(0, Math.min(maxScroll, newScroll));
  }

  endDrag() {
    this.isDragging = false;
    this.globalListeners.forEach(remove => remove());
    this.globalListeners = [];
  }

  get isOverflowing(): boolean {
    return this.player?.cards?.length > 6;
  }

  get needsScroll(): boolean {
    return this.player?.cards?.length > 6;
  }

  beginDrag(event: MouseEvent) {
    this.isDragging = true;
    const wrapper = this.cardsScrollWrapper.nativeElement;
    wrapper.classList.add('grabbing');
    this.duringDrag(event);
  }

  handleCardClick(index: number, event: MouseEvent) {
    if (this.isDragging) {
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    if (this.currentUser.id !== this.player.id) {
      return;
    }

    if (!this.isCurrent) {
      this.showError('Nem te következel!');
      return;
    }
    const selectedCard = this.player?.cards[index];
    const isValidPlay = this.isValidPlay(selectedCard) && this.selectedCardIndex !== undefined;

    if (this.PlusDraws && !isValidPlay) {
      this.showError('Csak olyan kártyát rakhatsz le, amitől a másik játékos(ok) nak lapot kell felvenni!');
      return;
    }

    if (!isValidPlay) {
      this.showError('Csak olyan kártyát rakhatsz ami egyezik színben vagy szimbólumban vagy speciális!');
      return;
    }

    if (this.selectedCardIndex === index) {
      if (isValidPlay) {
        this.playCard.emit(index);
        this.selectedCardIndex = null;
      } else {
        this.showError('Érvénytelen kártya!');
      }
    } else {
      if (isValidPlay) {
        this.selectedCardIndex = index;
      } else {
        this.showError('Csak olyan kártyát rakhatsz ami egyezik színben vagy szimbólumban!');
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.selectedCardIndex != null) {
      this.selectedCardIndex = null;
    }
    this.clearError();
  }

  showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => this.clearError(), 2000);
  }

  clearError() {
    this.errorMessage = '';
  }

  private isValidPlay(playedCard: Card): boolean {
    const topCard = this.discardPileTopCard;

    if (this.PlusDraws) {
      return topCard && ['plus2', 'plus4'].includes(playedCard.symbol);
    }

    return !topCard ||
      playedCard.color === topCard.color ||
      playedCard.symbol === topCard.symbol ||
      ['change', 'plus4'].includes(playedCard.symbol);
  }

  calculatePlacement() {
    let number = this.placements.indexOf(this.player.id) + 1;
    if(number === 0){
      number = this.placements.length + 1;
    }
    return number;
  }
}
