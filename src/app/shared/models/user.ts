export interface User {
  email: string;
  inLobby: string;
  inGame: string;
  inSpectate: string;
  playingGame: string;
  lastLoginAt: Date;
  registeredAt: Date;
  picture:string;
  roles: string[];
  id: string;
  username: string;
  xp:number;
  level: number;
  badges: string[];
  xpForNextLevel: number;
}
