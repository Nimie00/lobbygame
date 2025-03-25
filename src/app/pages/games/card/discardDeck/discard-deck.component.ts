import { Component, Input } from '@angular/core';
import { Card } from '../../../../shared/models/games/card.model'; // Feltételezve, hogy van Card interfész

@Component({
  selector: 'app-discard-deck',
  template: `
    <div class="deck discard-deck">
      <div class="card front" *ngIf="topCard">
        <img
        [ngSrc]="'assets/cards/'+topCard.color+'_'+topCard.symbol+'.png'"
        height="160"
        width="80"
        alt="{{topCard.color+'_'+topCard.symbol}}" />
      </div>
    </div>

  `,
  styleUrls: ['../deck.component.scss']
})
export class DiscardDeckComponent {
  @Input() topCard: Card;
  @Input() count: number = 0;
}
