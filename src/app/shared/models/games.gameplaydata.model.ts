export interface BaseGame {
  lobbyName: string;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  lobbyId: string;
  ownerId: string;
  gameType: string;
  players: string[];
  spectators: string[];
  playerNames: string[];
  spectatorNames: string[];
  gameModifiers: Record<string, any>;
  currentRound: number;
  maxRounds: number;
  bestOfRounds: number;
  gameEnded: boolean;
  rounds: {
    [roundNumber: number]: {
      choices: {
        [player: string]: {
          choice: string;
          timestamp: Date
        };
      };
      winner: string | null;
    };
  };
  winner: string | null;
  endReason: string | null;
}
