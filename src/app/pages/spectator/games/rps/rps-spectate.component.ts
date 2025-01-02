import {Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {SubscriptionTrackerService} from "../../../../shared/services/subscriptionTracker.service";

@Component({
  selector: 'app-rps-spectate',
  templateUrl: './rps-spectate.component.html',
  styleUrls: ['./rps-spectate.component.scss']
})
export class RpsSpectateComponent implements OnInit, OnDestroy, OnChanges {
  private CATEGORY = "rpsSpectate"
  @Input() game!: any;
  lobbyId: string;
  gameEnded: boolean = false;
  winner: string | null = null;
  timeline: any[] = [];
  choice1: string = null;
  choice2: string = null;
  name1: string;
  name2: string;
  allchanges: number = -1;
  roundchanes: number = -1;
  @Input() playerChoices: { [username: string]: string } = {};
  private roundWinner: string;



  constructor(
    private route: ActivatedRoute,
    private tracker: SubscriptionTrackerService,
  ) {

    this.lobbyId = this.route.snapshot.paramMap.get('lobbyId') || '';
  }

  ngOnInit() {
    this.name1 = this.game.playerNames[0]
    this.name2 = this.game.playerNames[1]
  }


  ngOnDestroy(): void {
    this.tracker.unsubscribeCategory(this.CATEGORY);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['playerChoices'] && changes['playerChoices'].currentValue) {
      if (changes['playerChoices'] && Object.keys(changes['playerChoices'].currentValue).length === 0) {
        this.allchanges = -1;
        this.roundchanes = -1;
      }
      this.playerChoices = changes['playerChoices'].currentValue;
      this.allchanges += 1;
      this.roundchanes += 1;
      this.choice1 = this.playerChoices[this.name1]
      this.choice2 = this.playerChoices[this.name2]

      if (this.roundchanes === 2) {

        if (this.choice1 === this.choice2) {
          console.log("Winner: draw");
          this.roundWinner= "draw";
        } else if (
          (this.choice1 === 'ko' && this.choice2 === 'ollo') ||
          (this.choice1 === 'papir' && this.choice2 === 'ko') ||
          (this.choice1 === 'ollo' && this.choice2 === 'papir')
        ) {
          console.log("Winner: " + this.name1);
          this.roundWinner = this.name1;
        } else {
          console.log("Winner: " + this.name2);
          this.roundWinner = this.name2;
        }

        setTimeout(() => {
          this.roundchanes = 0;
          this.playerChoices[this.name1] = null;
          this.playerChoices[this.name2] = null;
          this.choice1 = this.playerChoices[this.name1];
          this.choice2 = this.playerChoices[this.name2];

        }, 750);
      }
    }
  }
}
