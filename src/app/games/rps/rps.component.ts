import {Component, OnDestroy, OnInit} from '@angular/core';
import {RpsService} from "../../services/game-services/rps.service";
import {ActivatedRoute, Router} from "@angular/router";
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
  isPlayer: boolean;
  selectedRound: number = 0;
  currentRound: number = 0;
  drawCount: number = 0;
  protected rounds: {
    roundNumber: number;
    choices: { [p: string]: { choice: string; timestamps: Date } };
    winner: string | null
  }[];
  timeline: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private rpsService: RpsService,
    private lobbyService: LobbyService,
    private tracker: SubscriptionTrackerService,
    private firestore: AngularFirestore,
    private router: Router,
  ) {
    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }

  ngOnInit() {
    const rpsSubscription = this.rpsService.getCurrentUserAndGame(this.lobbyId)
      .subscribe(async ({user, game}) => {
        console.log(game);
        this.currentUser = user;
        this.game = game;
        this.isPlayer = game.players.includes(this.currentUser.id);
        this.winner = game.winner;
        this.rounds = this.getRounds();

        if(!this.isPlayer){
          this.router.navigate(['/spectate/' + this.lobbyId]);
        }

        if (this.game && this.isPlayer) {
          this.currentRound = game.currentRound;
          const currentRoundData = this.game.rounds?.[this.currentRound];

          if (this.selectedRound < this.currentRound || this.selectedRound == this.currentRound) {
            this.playerChoice = null;
            this.selectedRound = this.currentRound;
          }

          if (game.status === 'ended') {
            this.gameEnded = true;
            return;
          }

          if (currentRoundData) {
            if (this.game?.rounds) {
              this.drawCount = Object.values(this.game.rounds).filter((round: any) => round.winner === "draw").length;
            }
            this.playerChoice = currentRoundData.choices?.[user.id]?.choice || null;
            if (this.currentUser.id === game.ownerId) {
              const allPlayersChosen = this.game.players.every((playerId: string) => currentRoundData.choices?.[playerId]?.choice !== undefined && currentRoundData.choices?.[playerId]?.choice !== null
              );

              if (allPlayersChosen && !this.gameEnded) {
                await this.determineWinner(game);
              }
            }
          }

        } else if (!this.isPlayer) {
        }
      });


    this.tracker.add(this.CATEGORY, "getGameAndUserSub", rpsSubscription);
  }


  private async determineWinner(gameData: any) {
    let { currentRound, maxRounds } = gameData;
    const players = Object.keys(gameData.rounds[currentRound]?.choices);
    const [choice1, choice2] = [
      gameData.rounds[currentRound].choices[players[0]]?.choice,
      gameData.rounds[currentRound].choices[players[1]]?.choice,
    ];
    let roundWinner: string;

    // Döntetlen vagy győztes meghatározása
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

    // Ellenőrizzük, hogy az aktuális kör döntetlen-e, és szükséges-e növelni a maxRounds értéket
    const isCurrentRoundDraw = roundWinner === "draw";

    if (isCurrentRoundDraw) {
      maxRounds++;
    }

    // Játékosok nyert köreinek számolása
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
    const requiredWins = Math.ceil((maxRounds - this.drawCount) / 2);
    const potentialWinner = players.find(player => playerWins[player] >= requiredWins);

    const roundUpdate: any = {
      [`rounds.${currentRound}.winner`]: roundWinner,
      currentRound: currentRound < maxRounds - 1 ? currentRound + 1 : currentRound,
      maxRounds: maxRounds,
    };

    if (potentialWinner) {
      this.winner = potentialWinner;
      this.endReason = "Someone Won";

      roundUpdate['winner'] = potentialWinner;
      roundUpdate['endReason'] = "Someone Won";

      await this.firestore.collection('gameplay').doc(gameData.lobbyId).update(roundUpdate);
      await this.endGame();
    } else {
      await this.firestore.collection('gameplay').doc(gameData.lobbyId).update(roundUpdate);
      this.selectedRound = currentRound + 1;
    }
  }


  makeChoice(choice: string) {
    if (!this.playerChoice && this.currentUser) {
      this.playerChoice = choice;
      this.rpsService.makeChoice(this.lobbyId, choice, this.currentUser.id, this.currentRound);
    }
  }

  private async endGame() {
    try {
      await this.lobbyService.endLobby(this.lobbyId, this.winner, this.endReason);
      this.gameEnded = true;
    } catch (error) {
      console.error('Error ending the game:', error);
    }
  }


  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  getRounds(): {
    roundNumber: number;
    choices: { [player: string]: { choice: string; timestamps: Date } };
    winner: string | null
  }[] {
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
    if (!this.game || !this.game.rounds || this.game.gameEnded == true) {
      return 0;
    }

    this.drawCount = Object.values(this.game.rounds).filter((round: any) => round.winner === "draw").length;
    const requiredWins = Math.ceil((this.game.maxRounds - this.drawCount+1) / 2);
    const playerWins = Object.values(this.game.rounds).filter((round: any) => round.winner === playerId).length;
    return requiredWins - playerWins
  }


  getPlayerName(playerId: string): string {
    const index = this.game.players.indexOf(playerId);
    return index !== -1 ? this.game.playerNames[index] : `Ismeretlen játékos (${playerId})`;
  }

}
