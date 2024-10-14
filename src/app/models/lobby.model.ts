export interface Lobby {
  id?: string;
  name: string;
  owner: string;
  ownerId: string;
  players: string[];
  spectators: string[];
  status: string;
  maxRounds: number;
  minPlayers: number;
  maxPlayers: number;
  currentRound: number;
  gameType: string;
  hasBots: boolean;
  otherSettings: any;
}
