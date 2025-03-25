import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-draw-deck',
  template: `
    <p>Card numbers: {{count}}</p>
    <div class="deck"
         (click)="handleClick()"
         [class.clickable]="isClickable"
         [title]="!isClickable ? 'Nem te következel!' : ''">
      <img [ngSrc]="'assets/cards/background.png'"
           height="160"
           width="80"
      alt="{{ 'UNKNOWN_CARD' | language }}" />
    </div>
  `,
  styleUrls: ['../deck.component.scss']
})
export class DrawDeckComponent {
  @Input() count: number = 0;
  @Input() currentPlayerId!: string;
  @Input() currentUserId!: string;
  @Output() draw = new EventEmitter<void>();

  get isClickable(): boolean {
    return this.currentPlayerId === this.currentUserId && this.count > 0;
  }

  handleClick() {
    if (this.isClickable) {
      this.draw.emit();
    }
  }
}
