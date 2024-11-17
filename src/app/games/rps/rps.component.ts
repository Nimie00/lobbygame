import {Component, OnDestroy, OnInit} from '@angular/core';
import {RpsService} from "../../services/game-services/rps.service";
import {ActivatedRoute} from "@angular/router";
import {LobbyService} from "../../services/lobby.service";
import {SubscriptionTrackerService} from "../../services/subscriptionTracker.service";

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

  constructor(
    private route: ActivatedRoute,
    private rpsService: RpsService,
    private lobbyService: LobbyService,
    private tracker: SubscriptionTrackerService,
  ) {
    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }

  ngOnInit() {
    const rpsSubscription = this.rpsService.getCurrentUserAndGame(this.lobbyId)
      .subscribe(({ user, game }) => {
        this.currentUser = user;
        this.game = game;
        if (game && game.choices) {
          this.playerChoice = game.choices[user.id] || null;
          if (Object.keys(game.choices).length === 2) {
            this.determineWinner(game.choices);
          }
        }
      });
    this.tracker.add(this.CATEGORY, "getGameAndUserSub",rpsSubscription);
  }
  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
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
      this.tracker.add(this.CATEGORY,"makeChoiceSub", rpsSub);
    }
  }

  private determineWinner(choices: Record<string, string>) {
    const players = Object.keys(choices);
    const [choice1, choice2] = [choices[players[0]], choices[players[1]]];

    if (choice1 === choice2) {
      this.winner = null;
    } else if (
      (choice1 === 'ko' && choice2 === 'ollo') ||
      (choice1 === 'papir' && choice2 === 'ko') ||
      (choice1 === 'ollo' && choice2 === 'papir')
    ) {
      this.winner = this.game.players[0];
    } else {
      this.winner = this.game.players[1];
    }

    if( this.gameEnded==false){
      this.endGame();
      this.gameEnded = true;
    }
  }

  private async endGame() {
    try {
      await this.rpsService.updateGameResult(this.lobbyId, this.winner);
      await this.lobbyService.endLobby(this.lobbyId);
    } catch (error) {
      console.error('Error ending the game:', error);
    }
  }
}
