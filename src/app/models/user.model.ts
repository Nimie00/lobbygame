import firebase from "firebase/compat";
import Timestamp = firebase.firestore.Timestamp;

export interface User {
  email: string;
  inLobby: string;
  lastLoginAt: Timestamp;
  registeredAt: Timestamp;
  roles: string[];
  id: string;
  username: string;
  xp:number;
  level: number;
  badges: string[];

}


