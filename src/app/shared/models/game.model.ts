export interface Game {
  id: string;
  name: string;
  recommendedPlayers: number;
  hasBots: boolean;
  minPlayers?: number;
  maxPlayers: number;
  gameModifiers?: { [key: string]: any };
  description: string;

}
