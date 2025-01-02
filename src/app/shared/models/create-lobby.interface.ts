export interface CreateLobbyData {
  name: string; // váró neve
  maxRounds: number;
  allowSpectators: boolean;
  private: boolean;
  password?: string;
  minPlayers?: number;
  maxPlayers?: number;
  gameType: any; // A game típust pontosítani kell a tényleges interfész alapján
}
