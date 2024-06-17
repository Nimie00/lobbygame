export interface Lobby {
  id: number;
  name: string;
  owner: string;
  players: number;
  maxPlayers: number;
  started: boolean;
  round: number;
  gameImage: string;
  currentRound: number;
  currentPlayers: number;

}
