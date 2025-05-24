import {Card} from "./games/card.model";

export interface PlayerAnimation {
  playedCard?: Card;
  drawCount?: number;
}
