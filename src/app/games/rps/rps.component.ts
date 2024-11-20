import {Component, OnDestroy, OnInit} from '@angular/core';
import {RpsService} from "../../services/game-services/rps.service";
import {ActivatedRoute} from "@angular/router";
import {LobbyService} from "../../services/lobby.service";
import {SubscriptionTrackerService} from "../../services/subscriptionTracker.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";

@Component({
  selector: 'app-rps',
  templateUrl: './rps.component.html',
  styleUrls: ['./rps.component.scss']
})
export class RpsComponent implements OnInit, OnDestroy {
  private CATEGORY = "rps"
  lobbyId: string;
  game: any;
  currentUser: any;
  playerChoice: string | null = null;
  gameEnded: boolean = false;
  winner: string | null = null;
  endReason: string;
  isSpectator: boolean;
  selctedRound: number = 0;


  constructor(
    private route: ActivatedRoute,
    private rpsService: RpsService,
    private lobbyService: LobbyService,
    private tracker: SubscriptionTrackerService,
    private firestore: AngularFirestore,
  ) {
    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }



  ngOnInit() {
    const rpsSubscription = this.rpsService.getCurrentUserAndGame(this.lobbyId)
      .subscribe(({user, game}) => {
        this.currentUser = user;
        this.game = game;
        this.isSpectator = !game.players.includes(this.currentUser.id);

        if (this.game && !this.isSpectator) {
          const currentRound = game.currentRound;
          const currentRoundData = this.game.rounds?.[currentRound];

          if(this.selctedRound < currentRound){
            this.playerChoice = null
            this.selctedRound = currentRound
          }

          if (game.status === 'ended') {
            this.gameEnded = true;
            return;
          }

          if (currentRoundData) {
            this.playerChoice = currentRoundData.choices?.[user.id]?.choice || null;

            const allPlayersChosen =
              this.game.players.every(playerId =>
                currentRoundData.choices?.[playerId]?.choice !== undefined
              );

            if (allPlayersChosen && !this.gameEnded) {
              this.determineWinner(game);
            }
          }
        }

      });

    this.tracker.add(this.CATEGORY, "getGameAndUserSub", rpsSubscription);
  }

  private async determineWinner(gameData: any) {
    const currentRound = gameData.currentRound;
    const maxRounds = gameData.maxRounds;
    const players = Object.keys(gameData.rounds[currentRound]?.choices);
    const [choice1, choice2] = [
      gameData.rounds[currentRound].choices[players[0]]?.choice,
      gameData.rounds[currentRound].choices[players[1]]?.choice,
    ];
    let roundWinner: string;

    if (choice1 === choice2) {
      roundWinner = "draw";
    } else if (
      (choice1 === 'ko' && choice2 === 'ollo') ||
      (choice1 === 'papir' && choice2 === 'ko') ||
      (choice1 === 'ollo' && choice2 === 'papir')
    ) {
      roundWinner = players[0];
    } else {
      roundWinner = players[1];
    }
    await this.firestore.collection('gameplay').doc(gameData.lobbyId).update({
      [`rounds.${currentRound}.winner`]: roundWinner,
    });
    this.selctedRound = currentRound;

    const playerWins: Record<string, number> = {};
    players.forEach(player => {
      playerWins[player] = 0;
    });

    for (let i = 0; i <= currentRound; i++) {
      const winner = gameData.rounds[i]?.winner;
      if (winner && winner !== "draw") {
        playerWins[winner]++;
      }
    }

    const requiredWins = Math.ceil(maxRounds / 2);
    const potentialWinner = players.find(player => playerWins[player] >= requiredWins);

    if (potentialWinner) {
      this.winner = potentialWinner;
      this.endReason = "Someone Won"
      await this.endGame();
    } else if (currentRound < maxRounds-1) {
      await this.firestore.collection('gameplay').doc(gameData.lobbyId).update({
        currentRound: currentRound + 1,
      });
    } else {
      this.winner = null
      this.endReason = "Out of rounds|Draw"
      await this.endGame();
    }
  }



  makeChoice(choice: string) {
    if (!this.playerChoice && this.currentUser) {
      const rpsSub = this.rpsService.makeChoice(this.lobbyId, choice)
        .subscribe({
          next: () => {
            this.playerChoice = choice;
          },
          error: (error) => {
            console.error('Error making choice:', error);
          }
        });
      this.tracker.add(this.CATEGORY, "makeChoiceSub", rpsSub);
    }
  }

  private async endGame() {
    this.gameEnded = true;
    try {
      await this.lobbyService.endLobby(this.lobbyId, this.winner, this.endReason);
    } catch (error) {
      console.error('Error ending the game:', error);
    }
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }






  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  getRounds(): { roundNumber: number; choices: { [player: string]: { choice: string; timestamps: Date } }; winner: string | null }[] {
    if (!this.game || !this.game.rounds) {
      return [];
    }
    return Object.entries(this.game.rounds).map(([roundNumber, roundData]) => {
      const data = roundData as {
        choices: { [player: string]: { choice: string; timestamps: Date } };
        winner: string | null;
      };
      return {
        roundNumber: +roundNumber,
        choices: data.choices,
        winner: data.winner
      };
    });
  }

  getRemainingWins(playerId: string): number {
    if (!this.game || !this.game.rounds) {
      return 0;
    }
    const maxWins = Math.ceil(this.game.maxRounds / 2);
    const playerWins = Object.values(this.game.rounds).filter((round: any) => round.winner === playerId).length;
    return maxWins - playerWins;
  }

  getPlayerName(playerId: string): string {
    const index = this.game.players.indexOf(playerId);
    return index !== -1 ? this.game.playerNames[index] : `Ismeretlen játékos (${playerId})`;
  }

}
