import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  Renderer2,
  ViewChild
} from "@angular/core";
import {CardPlayer} from "../../../../shared/models/games/cardPlayer";
import {User} from "../../../../shared/models/user";
import {play} from "ionicons/icons";
import {Card} from "../../../../shared/models/games/card.model";
import {ActivatedRoute} from "@angular/router";
import {animate, sequence, style, transition, trigger} from "@angular/animations";
import {PlayerAnimation} from "../../../../shared/models/playerAnimation";

@Component({
  selector: 'app-player-hand',
  template: `
    <div class="full-height">
      <ng-container *ngIf="!gameEnded && player && !placements.includes(player.id)" [class.current]="isCurrent">
      <span class="center-labels">
      <ion-label [class.current]="isCurrent">{{ player.name }} - {{ "NUMBER_OF_CARDS" | language }}
        : {{ player.cards.length }}</ion-label>
        </span>
        <div class="cards-container">
          <div class="cards-scroll-wrapper" [class.has-scroll]="needsScroll"
               (mousedown)="startDrag($event)"
               #cardsScrollWrapper>

            <div
              *ngIf="animations[player.id]?.playedCard as card"
              class="middle"
              #PlayedCardAnim>
              <img
                [@flyUpFadeOut]
                [ngSrc]="'assets/cards/' + card.color + '_' + card.symbol + '.png'"
                height="200"
                width="100"
                class="card animatedCard"
                alt="{{ card.color + '_' + card.symbol }}"
                (load)="centerAndAnimate(PlayedCardAnim)"
              />
            </div>

            <div *ngIf="animations[player.id]?.drawCount as dc">
              <div class="middle drawn" #DrawnCardAnim [@drawCardAnim]>
                <img
                  ngSrc="assets/cards/background.png"
                  width="100" height="200"
                  class="card drawnCard"
                  alt="background"
                  (load)="centerAndAnimate(DrawnCardAnim)"
                />
                <span class="draw-count">{{ dc }}</span>
              </div>
            </div>

            <div class="cards" [class.overflowing]="isOverflowing">
              <div
                *ngFor="let card of player.cards; let i = index"
                (click)="handleCardClick(i, $event)"
                [ngClass]=" currentUser.id === player.id ? 'yourcard' : 'notyourcard' "
                [class.selected]="selectedCardIndex === i"
                class="card-wrapper">
                <img
                  *ngIf="currentUser.id === player.id || spectate"
                  [ngSrc]="'assets/cards/'+card.color+'_'+card.symbol+'.png'"
                  height="80"
                  width="40"
                  class="card playingCard"
                  [class.plus]="!spectate && PlusDraws && isCurrent && ('plus4' === card.symbol || ('plus2' === card.symbol && card.color === discardPileTopCard.color))"
                  [class.playable]="!spectate && isCurrent && isValidPlay(card)"
                  alt="{{card.color+'_'+card.symbol}}"/>

                <!--              [ngSrc]="'assets/cards/background.png'"  -->
                <!-- [ngSrc]= "'assets/cards/'+card.color+'_'+card.symbol+'.png'"
                 [class.playable] = "isValidPlay(card)"
                 -->

                <img
                  *ngIf="currentUser.id !== player.id && !spectate"
                  [ngSrc]="'assets/cards/background.png'"
                  height="80"
                  width="40"
                  class="card playingCard"
                  alt="{{ 'UNKNOWN_CARD' | language }}"/>
              </div>
            </div>
            <div *ngIf="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>
          </div>
        </div>
      </ng-container>


      <ng-container *ngIf="placements.includes(player.id) || gameEnded">
        <div class="finished">
          <div><span class="center-labels">
          <ion-label>
            {{ player?.name }}
            <span *ngIf="player.id === currentUser.id">({{ "YOU" | language }})</span>
            <h2>{{"PLACEMENT" | language}}: {{ calculatePlacement() }}.</h2>
          </ion-label>
        </span>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styleUrls: ['./player-hands.component.scss'],
  animations: [
    trigger('flyUpFadeOut', [
      transition(':enter', [
        style({transform: '', opacity: 1}),
        sequence([
          animate(
            '0.6s ease-out',
            style({
              transform: 'translateY(-50px)',
              opacity: 1,
            })
          ),
          animate(
            '0.2s ease-in',
            style({
              transform: 'translateY(-100px)',
              opacity: 0,
            })
          ),
        ]),
      ]),
    ]),
    trigger('drawCardAnim', [
      transition(':enter', [
        style({transform: 'translateY(-100px)', opacity: 0}),
        animate('0.8s ease-out', style({transform: 'translateY(-30px)', opacity: 1})),
      ]),
    ])
  ],
})
export class PlayerHandComponent implements OnInit {
  @ViewChild('cardsScrollWrapper') cardsScrollWrapper: ElementRef<HTMLElement>;
  @ViewChild('PlayedCardAnim') PlayedCardAnim!: ElementRef<HTMLElement>;
  @ViewChild('card') cardImage: ElementRef;
  @Input() currentUser: User;
  @Input() player: CardPlayer;
  @Input() isCurrent?: boolean = false;
  @Input() discardPileTopCard?: Card;
  @Input() PlusDraws?: boolean;
  @Input() gameEnded?: boolean;
  @Input() animations: { [playerId: string]: PlayerAnimation } = {};
  @Input() placements?: string[];
  @Output() playCard?: EventEmitter<number> = new EventEmitter<number>();
  protected readonly play = play;
  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;
  private globalListeners: (() => void)[] = [];
  private moveThreshold = 5; // Pixelekben


  constructor(private route: ActivatedRoute,
              private renderer: Renderer2
  ) {
  }


  selectedCardIndex: number | null = null;
  errorMessage: string = '';
  spectate: boolean;


  ngOnInit() {
    this.spectate = this.route.snapshot.url.map(segment => segment.path).join('/').includes('spectate');
  }

  startDrag(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (target.className.includes('playable')) {
      event.preventDefault();
      this.endDrag();
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
    if (this.spectate) {
      return;
    }
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

  centerAndAnimate(containerRef: HTMLDivElement) {
    const wrapper = this.cardsScrollWrapper.nativeElement;
    const elDiv = containerRef;

    const imgEl = wrapper.getElementsByClassName('playingCard').item(1) as HTMLImageElement;
    const targetImg = elDiv.children.item(0);
    if (!imgEl) return;


    const elW: number = imgEl.clientWidth;
    const elH: number = imgEl.clientHeight;

    this.renderer.setStyle(targetImg, 'width', `${elW}px`);
    this.renderer.setStyle(targetImg, 'height', `${elH}px`);
    this.renderer.setStyle(elDiv, 'width', `${elW}px`);
    this.renderer.setStyle(elDiv, 'height', `${elH}px`);

    const scrollX = wrapper.scrollLeft;
    const visibleW = wrapper.clientWidth;

    const left = scrollX + (visibleW - elW) / 2;

    const scrollY = wrapper.scrollTop;
    const visibleH = wrapper.clientHeight;
    const top = scrollY + (visibleH - elH) / 2;

    this.renderer.setStyle(elDiv, 'position', 'absolute');
    this.renderer.setStyle(elDiv, 'left', `${left}px`);
    this.renderer.setStyle(elDiv, 'top', `${top}px`);

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

  protected isValidPlay(playedCard: Card): boolean {
    const topCard = this.discardPileTopCard;

    if (this.PlusDraws) {
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

  calculatePlacement() {
    let number = this.placements.indexOf(this.player.id) + 1;
    if (number === 0) {
      number = this.placements.length + 1;
    }
    return number;
  }
}
