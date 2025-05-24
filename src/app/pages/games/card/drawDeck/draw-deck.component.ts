import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-draw-deck',
  template: `
    <div class="draw-container"
         [class.spectate]="spectate">
      <div class="deck-wrapper"
            (click)="handleClick()"
           [class.clickable]="isClickable"
           [title]="!isClickable && !gameEnded ? 'Nem te következel!' : ''">
        <div *ngFor="let layer of getStackLayers(); let i = index"
             class="stack-layer"
             [style.z-index]="i"
             [class.layer-1]="i === 0"
             [class.layer-2]="i === 1"
             [class.layer-3]="i === 2"
             [class.layer-4]="i === 3"
             [class.layer-5]="i === 4">
          <img [ngSrc]="'assets/cards/background.png'"
               class="deck-card"
               height="160"
               width="80"
               alt="Card back"/>
        </div>

        <div class="deck-interactive">
          <div class="count-badge">{{ stackSize }}</div>
        </div>
      </div>
      <ion-label class="deck-label">{{ "DRAW_PILE" | language }}</ion-label>
    </div>
  `,
  styleUrls: ['../deck.component.scss']
})
export class DrawDeckComponent {
  @Input() stackSize: number = 0;
  @Input() currentPlayerId!: string;
  @Input() currentUserId!: string;
  @Input() gameEnded: boolean;
  @Output() draw = new EventEmitter<void>();
  @Input() spectate!: boolean;


  get isClickable(): boolean {
    return !this.spectate && this.currentPlayerId === this.currentUserId && this.stackSize > 0 && !this.gameEnded;
  }

  handleClick() {
    if (this.isClickable) {
      this.draw.emit();
    }
  }

  getStackLayers(): number[] {
    const safeCount: number = this.stackSize || 0;

    if (safeCount <= 1) return [0];
    if (safeCount <= 3) return [0, 1];
    if (safeCount <= 10) return [0, 1, 2];
    return [0, 1, 2, 3, 4];
  }
}
