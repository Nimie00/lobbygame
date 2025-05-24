import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {SubscriptionTrackerService} from "../../../shared/services/subscriptionTracker.service";
import {User} from "../../../shared/models/user";
import {LanguageService} from "../../../shared/services/language.service";
import {RPSGame} from "../../../shared/models/games/games.rps.gameplaydata.model";
import {overallGameService} from "../../../shared/services/game-services/overallGame.service";
import {firstValueFrom} from "rxjs";
import {Router} from "@angular/router";
import {CARDGame} from "../../../shared/models/games/games.card.gameplaydata.model";

@Component({
  selector: 'app-profile-statistics',
  templateUrl: './profile-statistics.component.html',
  styleUrls: ['./profile-statistics.component.scss']
})
export class ProfileStatisticsComponent implements OnInit, OnDestroy {


  private CATEGORY = "profileStats"
  @Input() user: User;
  selectedSegment = 'overall';
  games: RPSGame[];
  displayedGames = [];
  currentPage = 0;
  pageSize = 5;
  totalPages = 0;

  overallStats = {
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    totalRounds: 0,
    winRate: 0,
    avgDuration: 0,
    totalDraws: 0,
  };

  gameStats: {
    duration: number;
    result: string;
    totalDrawn: number;
    roundsWon: number;
    roundsDrawn: number;
    maxDrawnInRound: number;
    totalPlayed: number;
    totalRounds: number;
    totalPlus4s: number;
    roundsLost: number
    placement: number,
  };


  constructor(
    private tracker: SubscriptionTrackerService,
    private languageService: LanguageService,
    private gameOverallServic: overallGameService,
    private router: Router,
  ) {
  }

  get selectedGame(): any | undefined {
    return this.games.find((g: { lobbyId: string; }) => g.lobbyId === this.selectedSegment);
  }


  async ngOnInit() {
    await this.loadGames();
    await this.calculateOverallStats();
    this.updateDisplayedGames();
  }

  async loadGames() {
    this.games = await firstValueFrom(this.gameOverallServic.getGames(this.user.id));
  }

  async calculateOverallStats() {
    this.overallStats.totalGames = this.games.length;

    this.overallStats.totalWins = this.games.filter(
      (game) => game.winner === this.user.id).length;

    this.overallStats.totalLosses = this.games.filter(
      (game) => game.winner && game.winner !== this.user.id).length;

    this.overallStats.totalDraws = this.games.filter((game) => game.winner === 'draw').length;

    this.overallStats.winRate = (this.overallStats.totalWins / (this.overallStats.totalGames != 0 ? this.overallStats.totalGames : 1) ) * 100;


    this.overallStats.totalRounds = this.games.reduce((sum, game) => sum + Object.keys(game.rounds).length, 0);


    const totalDuration = this.games.reduce((sum, game) => {
      if (game.startedAt && game.endedAt) {
        return sum + (game.endedAt.getTime() - game.startedAt.getTime());
      }
      return sum;
    }, 0);
    this.overallStats.avgDuration = totalDuration / (this.overallStats.totalGames != 0 ? this.overallStats.totalGames : 1);
  }

  getRPSGameStats(game: RPSGame) {
    const userId = this.user.id;
    const rounds = Object.values(game.rounds);

    return {
      totalRounds: rounds.length,
      roundsWon: rounds.filter((round) => round.winner === userId).length,
      roundsLost: rounds.filter(
        (round) => round.winner && round.winner !== userId && round.winner !== 'draw'
      ).length,
      roundsDrawn: rounds.filter((round) => round.winner === 'draw').length,
      duration:
        game.startedAt && game.endedAt
          ? game.endedAt.getTime() - game.startedAt.getTime()
          : 0,
      result: game.winner === userId
        ? `VICTORY`
        : game.winner !== '#Drew'
          ? `LOSE`
          : `DRAW`,
      totalPlus4s: null,
      totalDrawn: null,
      maxDrawnInRound: null,
      totalPlayed: null,
      placement: null,
    };

  }

  getCARDGameStats(game: CARDGame) {
    const userId = this.user.id;
    const rounds = Object.values(game.rounds);

    let totalPlus4s = 0;
    let maxDrawnInRound = 0;
    let totalDrawn = 0;
    let totalPlayed = 0;

    rounds.forEach(round => {

      const allChoices: string[] = Object.values(round.choices)
        .flatMap(c => Array.isArray(c.choice) ? c.choice : [c.choice]);

      totalPlus4s += allChoices.filter(ch => ch === 'drawn-black_plus4').length;

      const drawsThisRound = allChoices.filter(ch => ch.startsWith('drawn-')).length;
      totalDrawn += drawsThisRound;
      maxDrawnInRound = Math.max(maxDrawnInRound, drawsThisRound);

      const playedThisRound = allChoices.filter(ch => ch.startsWith('played-')).length;
      totalPlayed += playedThisRound;
    });

    const placement = game.placements.indexOf(userId) !== -1 ? game.placements.indexOf(userId) + 1 :  game.players.length;

    return {
      totalRounds: rounds.length,
      totalPlus4s: totalPlus4s,
      totalDrawn: totalDrawn,
      maxDrawnInRound: maxDrawnInRound,
      totalPlayed: totalPlayed,
      duration:
        game.startedAt && game.endedAt
          ? game.endedAt.getTime() - game.startedAt.getTime()
          : 0,
      result:
        game.winner === userId
          ? 'VICTORY'
          : game.winner === 'draw'
            ? 'DRAW'
            : 'LOSE',
      roundsWon: 0,
      roundsLost: 0,
      roundsDrawn: 0,
      placement: placement,
    };
  }

  updateDisplayedGames() {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.displayedGames = this.games.slice(start, end);
    this.totalPages = Math.ceil(this.games.length / this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.updateDisplayedGames();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updateDisplayedGames();
    }
  }

  onSegmentChange() {
    if (this.selectedSegment === "overall") {
    } else if(this.selectedGame.gameType === "RPS") {
      this.gameStats = this.getRPSGameStats(this.selectedGame)
    } else {
      this.gameStats = this.getCARDGameStats(this.selectedGame)
    }
  }


  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  async goToGamePage() {
    await this.router.navigate(['/game/'+ this.selectedGame.gameType.toLowerCase() + '/'+ this.selectedGame.lobbyId]);
  }

  async goToWatchingReplay() {
    await this.router.navigate(['/lobbies/' + 'replays:' + this.selectedGame.lobbyId]);
  }

}
