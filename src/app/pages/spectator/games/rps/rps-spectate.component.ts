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
  @Input() playerChoices: { [username: string]: string } = {};
  lobbyId: string;
  gameEnded: boolean = false;
  winner: string | null = null;
  timeline: any[] = [];
  choice1: string = null;
  choice2: string = null;
  name1: string;
  name2: string;
  allChanges: number = -1;
  roundChanges: number = -1;
  roundWinner: string;



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
        this.allChanges = -1;
        this.roundChanges = -1;
      }
      this.playerChoices = changes['playerChoices'].currentValue;
      this.allChanges += 1;
      this.roundChanges += 1;
      this.choice1 = this.playerChoices[this.name1]
      this.choice2 = this.playerChoices[this.name2]

      if (this.roundChanges === 2) {

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
          this.roundChanges = 0;
          this.playerChoices[this.name1] = null;
          this.playerChoices[this.name2] = null;
          this.choice1 = null;
          this.choice2 = null;

        }, 99);
      }
    }
  }
}
