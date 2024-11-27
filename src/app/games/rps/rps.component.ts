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
  selectedRound: number = 0;
  protected rounds: {
    roundNumber: number;
    choices: { [p: string]: { choice: string; timestamps: Date } };
    winner: string | null
  }[];


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

          console.log(this.selectedRound + "Selectedround ")
          console.log(currentRound + "currentRound ")
          if(this.selectedRound < currentRound){
            this.playerChoice = null
            this.selectedRound = currentRound
          }

          if(this.selectedRound == currentRound){
            this.playerChoice = null
          }

          if (game.status === 'ended') {
            this.gameEnded = true;
            return;
          }

          if (currentRoundData) {
            this.playerChoice = currentRoundData.choices?.[user.id]?.choice || null;

            if(this.currentUser.id === game.ownerId){
              const allPlayersChosen =
                this.game.players.every(playerId =>
                  currentRoundData.choices?.[playerId]?.choice !== undefined
                );

              if (allPlayersChosen && !this.gameEnded) {
                console.log(this.currentUser.username+ ": megnézte, hogy ki nyerte a kört:")
                this.determineWinner(game);
              }
            }
          }
        }
        this.rounds = this.getRounds()
        console.log(this.rounds);

      });


    this.tracker.add(this.CATEGORY, "getGameAndUserSub", rpsSubscription);
  }

  private determineWinner(gameData: any): void {
    const currentRound = gameData.currentRound;
    const maxRounds = gameData.maxRounds;
    const players = Object.keys(gameData.rounds[currentRound].choices);
    const [choice1, choice2] = [
      gameData.rounds[currentRound].choices[players[0]].choice,
      gameData.rounds[currentRound].choices[players[1]].choice,
    ];

    let roundWinner: string | null = null;

    // Döntetlen vagy kör nyertese meghatározása
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

    // Nyertes bejegyzése az aktuális körre
    this.firestore.collection('gameplay').doc(gameData.lobbyId).update({
      [`rounds.${currentRound}.winner`]: roundWinner,
    });

    // Játékosok nyert körszámainak kiszámítása
    const playerWins: Record<string, number> = {};
    players.forEach(player => {
      playerWins[player] = 0;
    });

    for (let i = 1; i <= currentRound; i++) {
      const winner = gameData.rounds[i]?.winner;
      if (winner && winner !== "draw") {
        playerWins[winner]++;
      }
    }

    // Ellenőrizzük, hogy van-e játék nyertese
    const potentialWinner = players.find(player => playerWins[player] > Math.floor(maxRounds / 2));

    if (potentialWinner) {
      // Győztes meghatározása és játék vége
      this.firestore.collection('gameplay').doc(gameData.lobbyId).update({
        winner: potentialWinner,
        status: 'ended',
        endedAt: new Date(),
      });
      this.endGame();
    } else if (currentRound < maxRounds) {
      // Növeljük a currentRound értékét, ha nincs végső nyertes
      this.firestore.collection('gameplay').doc(gameData.lobbyId).update({
        currentRound: currentRound + 1,
      });
    } else {
      // Maximum kör után döntetlen játék
      this.firestore.collection('gameplay').doc(gameData.lobbyId).update({
        winner: null,
        status: 'ended',
        endedAt: new Date(),
      });
      this.endGame();
    }
  }



  makeChoice(choice: string) {
    if (!this.playerChoice && this.currentUser) {
      const rpsSub = this.rpsService.makeChoice(this.lobbyId, choice)
        .subscribe({
          next: () => {
            this.playerChoice = choice;
            console.log(this.currentUser + " Választott: " + choice)
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
