import firebase from "firebase/compat";
import Timestamp = firebase.firestore.Timestamp;

export interface User {
  email: string;
  inlobby: string;
  lastLoginAt: Timestamp;
  registeredAt: Timestamp;
  roles: string[];
  uid: string;
  username: string;
}


