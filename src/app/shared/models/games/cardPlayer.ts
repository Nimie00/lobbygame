import {Card} from "./card.model";

export interface CardPlayer {
  id: string;
  name: string;
  cards: Card[];
}
