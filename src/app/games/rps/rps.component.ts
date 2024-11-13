import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subject, Subscription, takeUntil} from "rxjs";
import {RpsService} from "../../services/game-services/rps.service";
import {ActivatedRoute} from "@angular/router";
import {LobbyService} from "../../services/lobby.service";


@Component({
  selector: 'app-rps',
  templateUrl: './rps.component.html',
  styleUrls: ['./rps.component.scss']
})
export class RpsComponent implements OnInit, OnDestroy {
  lobbyId: string;
  game: any;
  currentUser: any;
  playerChoice: string | null = null;
  gameEnded: boolean = false;
  winner: string | null = null;
  private gameSubscription: Subscription;
  private rpsSubscription: Subscription;
  private unsubscribe$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private rpsService: RpsService,
    private lobbyService: LobbyService,
  ) {
    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }

  ngOnInit() {
    this.rpsSubscription = this.rpsService.getCurrentUserAndGame(this.lobbyId)
      .pipe(takeUntil(this.unsubscribe$))
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
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  makeChoice(choice: string) {

    if (!this.playerChoice && this.currentUser) {
      this.rpsService.makeChoice(this.lobbyId, choice)
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe({
          next: () => {
            this.playerChoice = choice;
          },
          error: (error) => {
            console.error('Error making choice:', error);
          }
        });
    }
  }

  private determineWinner(choices: Record<string, string>) {
    const players = Object.keys(choices);
    const [choice1, choice2] = [choices[players[0]], choices[players[1]]];

    console.log([choices[players[0]], choices[players[1]]])
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

    console.log(this.winner);
    console.log(this.game.players);
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
