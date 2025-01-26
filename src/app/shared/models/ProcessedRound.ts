import {RoundData} from "./RoundData";

export interface ProcessedRound {
  roundNumber: number;
  choices: RoundData['choices'];
  winner: RoundData['winner'];
}
