import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from './shared/services/auth.service';
import {Router} from '@angular/router';
import {SubscriptionTrackerService} from "./shared/services/subscriptionTracker.service";
import {User} from "./shared/models/user.model";
import {Lobby} from "./shared/models/lobby.model";
import {Observable, pairwise, Subject, Subscription, tap} from "rxjs";
import {LanguageService} from "./shared/services/language.service";
import {ModalService} from "./shared/services/modal.service";
import {ThemeService} from "./shared/services/theme.service";
import {GameStartService} from "./shared/services/game-services/gameStart.service";
import {filter} from "rxjs/operators";
import {AudioService} from "./shared/services/audio.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private CATEGORY = "app"
  protected isLoggedIn: boolean = false;
  protected user: User = null;
  protected lobbyId: string;
  protected lobby: Observable<Lobby>;
  protected settingsOpen: boolean;
  private modalCloseSub: any;
  private userSubscription: Subscription;
  private destroy$ = new Subject<void>();
  private countdownTriggered = false;


  constructor(private authService: AuthService,
              private router: Router,
              private tracker: SubscriptionTrackerService,
              private modalService: ModalService,
              private gameStartService: GameStartService,
              private themeService: ThemeService,
              private languageService: LanguageService,
              private audioService: AudioService,
  ) {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.tracker.unsubscribeAll()
    this.audioService.stopAllSounds();
  }

  async ngOnInit() {
    this.userSubscription = this.authService.getUserObservable().pipe(
      tap(user => {
        this.isLoggedIn = !!user;
        this.user = user;
        if (!user) {
          this.countdownTriggered = false;
        }
      }),
      filter(user => !!user && user.inLobby != null && !this.countdownTriggered),
      pairwise(),
      filter(([prev, curr]) => prev.inGame === null && (curr.inGame !== null || curr.inSpectate !== null))
    ).subscribe(([_, curr]) => {
      this.countdownTriggered = true;
      this.gameStartService.handleCountdown(
        () => this.gameStartService.stopWatchingLobby(),
        curr.inLobby,
        curr.inGame !== null
      ).then(() => {
        console.log("Countdown elindult");
      });
    });

    this.tracker.add(this.CATEGORY, "getAuthState", this.userSubscription);


    this.modalCloseSub = this.modalService.modalClosed$.subscribe(() => {
      this.settingsOpen = false;
    });

    this.tracker.add(this.CATEGORY, "ModalCloseSub", this.modalCloseSub);
  }

  logout() {
    this.authService.logout().then(() => {
      this.gameStartService.stopWatchingLobby();
      this.isLoggedIn = false;
      this.user = null;
      this.router.navigate(['/login']).then(() => {});
    });
  }

  async openSettings() {
    this.settingsOpen = true;
    this.modalService.openModal('settings', {});
  }

  closeSettings() {
    this.modalService.closeModal()
  }

  isGameActive(): boolean {
    const url = this.router.url;
    if (url.includes(this.user.inGame)) {
      return url.includes('/game/');
    }
    return false;
  }

  isSpectateActive(): boolean {
    const url = this.router.url;
    if (url.includes(this.user.inSpectate)) {
      return url.includes('/spectate/');
    }
    return false;
  }

  openedInfoBefore(): boolean {
    return localStorage.getItem('infoOpened') === 'true';
  }
}
