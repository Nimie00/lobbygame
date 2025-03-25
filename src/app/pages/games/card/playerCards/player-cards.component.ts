import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild
} from "@angular/core";
import {CardPlayer} from "../../../../shared/models/games/cardPlayer";
import {User} from "../../../../shared/models/user.model";
import {play} from "ionicons/icons";
import {Card} from "../../../../shared/models/games/card.model";
@Component({
  selector: 'app-player-hand',
  template: `
    <ng-container *ngIf="!gameEnded">
    <div [class.current]="isCurrent">
      <h3>{{ player?.name}} - {{player?.cards.length}} darab kártya</h3>
      <div class="cards-container">
        <div class="cards">
          <div
            *ngFor="let card of player?.cards; let i = index"
            (click)="handleCardClick(i, $event)"
            [ngClass]=" currentUser.id === player.id ? 'yourcard' : 'notyourcard' "
            [class.selected]="selectedCardIndex === i"
            class="card-wrapper">
            <img
              *ngIf="currentUser.id === player.id"
              [ngSrc]="'assets/cards/'+card.color+'_'+card.symbol+'.png'"
              height="80"
              width="40"
              [class.plus] = "['plus2', 'plus4'].includes(card.symbol) && PlusDraws "
              alt="{{card.color+'_'+card.symbol}}" />
            <img
              *ngIf="currentUser.id !== player.id"
              [ngSrc]="'assets/cards/background.png'"
              height="80"
              width="40"
              alt="{{ 'UNKNOWN_CARD' | language }}" />
          </div>
        </div>
        <div *ngIf="errorMessage" class="error-message">
          {{ errorMessage }}
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
  @Input() currentUser: User;
  @Input() player?: CardPlayer;
  @Input() isCurrent?: boolean = false;
  @Input() discardPileTopCard?: Card;
  @Input() PlusDraws?: boolean;
  @Input() gameEnded?: boolean;
  @Input() placements?: string[];
  @Output() playCard: EventEmitter<number> = new EventEmitter<number>();
  @ViewChild('cardsContainer') cardsContainer!: ElementRef;
  protected readonly play = play;


  selectedCardIndex: number | null = null;
  errorMessage: string = '';


  ngOnInit() {
  }

  handleCardClick(index: number, event: MouseEvent) {
    event.stopPropagation();
    if (this.currentUser.id !== this.player.id) {
      return;
    }

    if (!this.isCurrent) {
      this.showError('Nem te következel!');
      return;
    }
    const selectedCard = this.player?.cards[index];
    const isValidPlay = this.isValidPlay(selectedCard);

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
