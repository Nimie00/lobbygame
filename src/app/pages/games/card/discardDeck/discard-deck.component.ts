import { Component, Input } from '@angular/core';
import { Card } from '../../../../shared/models/games/card.model'; // Feltételezve, hogy van Card interfész

@Component({
  selector: 'app-discard-deck',
  template: `
    <div class="discard-container">
      <div class="discard-wrapper">
        <div *ngFor="let card of getStackCards(); let i = index"
             class="discard-layer"
             [style.z-index]="i+1"
             [style.transform]="getLayerTransform(i)">
          <img [src]="'assets/cards/'+card.color+'_'+card.symbol+'.png'"
               class="discard-card"
               alt="{{card.color+'_'+card.symbol}}"/>
        </div>

        <div class="discard-top" *ngIf="topCard">
          <img [src]="'assets/cards/'+topCard.color+'_'+topCard.symbol+'.png'"
               class="discard-card active-card"
               alt="{{topCard.color+'_'+topCard.symbol}}"/>
          <div class="count-badge">{{stackSize}}</div>
        </div>

        <div *ngIf="!topCard" class="empty-discard">
          <div class="empty-icon">🗑️</div>
        </div>
      </div>
      <ion-label class="deck-label">{{"DISCARD_PILE" | language}}</ion-label>
    </div>
  `,
  styleUrls: ['../deck.component.scss']
})
export class DiscardDeckComponent {
  @Input() topCard: Card;
  @Input() stackSize?: number = 0;
  @Input() discardPile: any[] = [];

  getStackCards() {
    if (!this.discardPile || this.discardPile.length <= 1) return [];
    return this.discardPile
      .slice(1, Math.min(this.discardPile.length, 5))
      .reverse();
  }

  getLayerTransform(index: number): string {
    const layerDepth = this.getStackCards().length - index;
    const baseAngle = 1.5;
    const angle = layerDepth % 2 === 0 ? baseAngle : -baseAngle;
    const xOffset = layerDepth * 1.2;
    const yOffset = layerDepth * 1.7;

    return `
    translateX(${xOffset}px)
    translateY(${yOffset}px)
    rotate(${angle * layerDepth}deg)
  `;
  }
}


