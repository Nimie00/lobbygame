export interface Game {
  name: string;
  maxPlayers: number;
  recommendedPlayers: number;
  hasBots: boolean;
  minPlayers?: number;
  otherSettings?: { [key: string]: any };
}
