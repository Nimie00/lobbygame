export interface Lobby {
  id: string;
  name: string;
  ownerName: string;
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
  gameModifiers?: { [key: string]: any };
  password?:string;
  private:boolean;
  allowSpectators: boolean;
  playerNames: string[];
  spectatorNames: string[];
  bannedPlayers: string[];
  bannedPlayerNames: string[];

}
