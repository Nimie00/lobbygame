export interface RoundData {
  choices: Record<string, { choice: string; timestamp: Date }>;
  winner: string | null;
}

