import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {Observable} from "rxjs";
import {Card} from "../../models/games/card.model";
import {CARDGame} from "../../models/games/games.card.gameplaydata.model";
import {EndGameService} from "./endGameService";
import {Lobby} from "../../models/lobby.model";
import {RPSGame} from "../../models/games/games.rps.gameplaydata.model";

@Injectable({ providedIn: 'root' })
export class CardService {

  constructor(
    private firestore: AngularFirestore,
    private endGameService: EndGameService,
  ){}




  async drawCard(lobbyId: string, userId: string): Promise<Card[]> {
    const gameRef = this.firestore.collection<CARDGame>('gameplay').doc(lobbyId).ref;

    return this.firestore.firestore.runTransaction(async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      const gameData = gameDoc.data() as CARDGame;


      if (!gameData || gameData.currentPlayer !== userId) {
        throw new Error('Nem te következel vagy nem létezik a játék!');
      }

      if (gameData.deck.length === 0) {
        throw new Error('Nincs több kártya a pakliban!');
      }

      const pending = gameData.gameModifiers?.pendingDraws || 0;
      const drawCount = pending > 0 ? pending : 1;
      let deck = gameData.deck;
      let discardPile = gameData.discardPile;
      let deckCodes: string;

      if (deck.length <= drawCount && discardPile.length > 1) {
        const topDiscard = discardPile[0];
        const toShuffle = discardPile.slice(1);

        const normalizedToShuffle = toShuffle.map(card => {
          return card.symbol === 'plus4' || card.symbol === 'change'
            ? { ...card, color: 'black' }
            : card;
        });

        deck = this.shuffleDeck([...deck, ...normalizedToShuffle]);

        deckCodes = this.logDeckState(deck);

        discardPile = [topDiscard];
      }

      if (deck.length < drawCount) {
        throw new Error(`Nincs elég kártya (szükséges: ${drawCount}, elérhető: ${deck.length})`);
      }


      const drawnCards = deck.slice(0, drawCount);
      const newDeck = deck.slice(drawCount);


      const currentRound = gameData.currentRound || 0;
      const choicePath = `rounds.${currentRound}.choices.${userId}`;
      const drawnChoices = drawnCards.map(card => `drawn-${card.color}_${card.symbol}`);


      const updatedHands = {
        ...gameData.hands,
        [userId]: [...gameData.hands[userId], ...drawnCards]
      };


      const newModifiers = { ...gameData.gameModifiers };
      if (pending > 0) {
        newModifiers.pendingDraws = 0;
      }


      const nextPlayer = this.calculateNextPlayer(
        gameData.players,
        gameData.currentPlayer,
        gameData.direction,
        1,
        gameData.placements || [],
      );


      transaction.update(gameRef, {
        deck: newDeck,
        discardPile: discardPile,
        hands: updatedHands,
        currentPlayer: nextPlayer,
        gameModifiers: newModifiers,
        [choicePath]: {
          choice: drawnChoices,
          timestamp: new Date()
        },
        currentRound: currentRound + 1,
        deckHistory: deckCodes
          ? [...gameData.deckHistory, deckCodes]
          : [...gameData.deckHistory]
      });

      return drawnCards;
    });
  }

  private logDeckState(deck: Card[]) {
    return deck.map(c => this.cardToCode(c)).join(',');
  }

  async playCard(lobbyId: string, userId: string, cardIndex: number, selectedColor?: string): Promise<void> {
    const gameRef = this.firestore.collection<CARDGame>('gameplay').doc(lobbyId).ref;

    return this.firestore.firestore.runTransaction(async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      const gameData = gameDoc.data() as CARDGame;

      if (!gameData || gameData.currentPlayer !== userId) {
        throw new Error('Nem te következel vagy nem létezik a játék!');
      }

      if (cardIndex >= gameData.hands[userId].length || cardIndex < 0) {
        throw new Error('Érvénytelen kártya pozíció!');
      }

      const playedCard = gameData.hands[userId][cardIndex];
      const pendingDraws = gameData.gameModifiers?.pendingDraws || 0;

      if (['change', 'plus4'].includes(playedCard.symbol)) {
        if (!selectedColor || !['red', 'blue', 'green', 'yellow'].includes(selectedColor)) {
          throw new Error('Érvénytelen szín kiválasztása');
        }
        if (selectedColor === playedCard.color) {
          throw new Error('Válassz másik színt!');
        }
      }



      if (pendingDraws > 0) {
        const topCard = gameData.discardPile[0];
        if (topCard &&
          ((topCard.symbol === "plus2" || topCard.symbol === "plus4") &&
            playedCard.symbol !== "plus2" &&
            playedCard.symbol !== "plus4")) {
          throw new Error('Csak plus2 vagy plus4 kártyát rakhatsz!');
        }

        if (topCard &&
          topCard.symbol === "plus4" &&
          playedCard.symbol === "plus2" &&
          playedCard.color !== topCard.color) {
          throw new Error('Csak olyan plus2 kártyát rakhatsz, aminek a színe megegyezik a plus4 színével!');
        }
      } else if (gameData.discardPile.length > 0) {
        const topCard = gameData.discardPile[0];

        let effectiveColor = ['change', 'plus4'].includes(playedCard.symbol)
          ? selectedColor!
          : playedCard.color;

        if (!selectedColor && effectiveColor !== topCard.color && playedCard.symbol !== topCard.symbol) {
          throw new Error('Nem egyezik a szín vagy szimbólum!');
        }
      }


      const modifiedCard = {
        ...playedCard,
        color: ['change', 'plus4'].includes(playedCard.symbol)
          ? selectedColor!
          : playedCard.color
      };

      const updatedHands = {
        ...gameData.hands,
        [userId]: gameData.hands[userId].filter((_, i) => i !== cardIndex)
      };


      const { nextPlayer, newDirection, additionalModifiers } =
        this.handleCardEffects(modifiedCard, gameData, gameData.placements || []);


      let newPlacements = [...gameData.placements];
      if (updatedHands[userId].length === 0) {
        newPlacements = [...newPlacements, userId];
      }

      const currentRound = gameData.currentRound || 0;
      const choicePath = `rounds.${currentRound}.choices.${userId}`;
      const choice = playedCard
        ? `played-${modifiedCard.color}_${modifiedCard.symbol}`
        : 'drawCard';

      const choiceData = {
        [choicePath]: {
          choice,
          timestamp: new Date(),
          ...(['change', 'plus4'].includes(playedCard.symbol) && { color: selectedColor })
        }
      };



      const updateData: Partial<CARDGame> = {
        ...choiceData,
        currentRound: currentRound + 1,
        hands: updatedHands,
        discardPile: [modifiedCard, ...gameData.discardPile],
        currentPlayer: nextPlayer,
        direction: newDirection,
        gameModifiers: {
          ...gameData.gameModifiers,
          ...additionalModifiers
        },
        placements: newPlacements,
      };


      if (newPlacements.length === gameData.players.length - 1) {
        updateData.winner = gameData.players.find(p => !newPlacements.includes(p))!;
        updateData.status = 'ended';
        updateData.endedAt = new Date();
        updateData.endReason = "Someone won";
        updateData.gameEnded = true;
      }

      transaction.update(gameRef, updateData);




      if (newPlacements.length === gameData.players.length - 1) {
      const newGameData: CARDGame = {
        ...gameData,
        ...updateData,
        hands: {
          ...gameData.hands,
          ...updateData.hands
        },
        discardPile: [
          modifiedCard,
          ...gameData.discardPile.filter((_, i) => i !== 0) // Eltávolítjuk a régi top kártyát
        ],
        gameModifiers: {
          ...gameData.gameModifiers,
          ...updateData.gameModifiers
        },
      };

      await this.endGameService.endLobby(newGameData.lobbyId ,newGameData.winner, newGameData.endReason, newGameData);
      }
    });
  }

  private calculateNextPlayer(
    allPlayers: string[],
    currentPlayer: string,
    direction: number,
    skipCount: number,
    placements: string[]
  ): string {
    const activePlayers = allPlayers.filter(p => !placements.includes(p));
    const currentIndex = activePlayers.indexOf(currentPlayer);
    const nextIndex = (currentIndex + (direction * skipCount) + activePlayers.length) % activePlayers.length;

    return activePlayers[nextIndex];
  }


  private handleCardEffects(
    card: Card,
    gameData: CARDGame,
    placements: string[]
  ) {
    const activePlayersCount = gameData.players.length - placements.length;
    let newDirection = gameData.direction;
    let skipCount = 1;
    const modifiers = {...gameData.gameModifiers};

    switch(card.symbol) {
      case 'reverse':
        if (activePlayersCount === 2) {
          skipCount = 2;
          newDirection *= -1;
        } else {
          newDirection *= -1;
        }
        break;

      case 'skip':
        skipCount = 2;
        break;

      case 'plus2':
        modifiers.pendingDraws = (gameData.gameModifiers.pendingDraws || 0) + 2;
        break;

      case 'plus4':
        modifiers.pendingDraws = (gameData.gameModifiers.pendingDraws || 0) + 4;
        break;
    }

    return {
      nextPlayer: this.calculateNextPlayer(
        gameData.players,
        gameData.currentPlayer,
        newDirection,
        skipCount,
        placements
      ),
      newDirection,
      additionalModifiers: modifiers
    };
  }


  getGameState(lobbyId: string): Observable<any> {
    return this.firestore.collection('gameplay').doc(lobbyId).valueChanges();
  }

  createUnoDeck(): Card[] {
    const colors: string[] = ['red', 'yellow', 'green', 'blue'];
    const symbols: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'plus2'];
    const deck: Card[] = [];
    let idCounter = 1;

    for (const color of colors) {
      for (const symbol of symbols) {
        deck.push({ id: idCounter++, color:color, symbol:symbol, special: false });
        if (symbol !== '0') {
          deck.push({ id: idCounter++, color:color, symbol:symbol, special: false });
        }
      }
    }

    const specialCards = ['change', 'plus4'];
    for (const specialCard of specialCards) {
      for (let i = 0; i < 4; i++) {
        deck.push({ id: idCounter++, color: 'black', symbol: specialCard, special: true });
      }
    }

    return deck;
  }


  shuffleDeck(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }


  createCARDGame(lobby: Lobby, baseData: RPSGame) {
    let initialHandSize = lobby.gameModifiers.handSize ? lobby.gameModifiers.handSize : 7;
    const fullDeck = this.createUnoDeck();
    let shuffledDeck = this.shuffleDeck(fullDeck);
    let cardHistroy =  this.logDeckState(shuffledDeck);

    const hands: { [playerId: string]: Card[] } = {};
    for (const playerId of lobby.players) {
      hands[playerId] = shuffledDeck.splice(0, initialHandSize);
    }

    let initialDiscardCard: Card | null = null;

    for (let i = 0; i < shuffledDeck.length; i++) {
      if (['0','1','2','3','4','5','6','7','8','9'].includes(shuffledDeck[i].symbol)) {
        initialDiscardCard = shuffledDeck[i];
        shuffledDeck = [...shuffledDeck.slice(0, i), ...shuffledDeck.slice(i + 1)];
        break;
      }
    }

    const remainingDeck = shuffledDeck;

    const CardData: RPSGame & {
      hands: { [playerId: string]: Card[] },
      deck: Card[],
      discardPile: Card[],
      currentPlayer: string,
      direction: number,
      placements: string[],
      deckHistory: string[],
    } = {
      ...baseData,
      hands: hands,
      deck: remainingDeck,
      discardPile: [initialDiscardCard] || [],
      currentPlayer: lobby.players[0],
      direction: 1, // 1: óramutató járásával megegyező irány, -1: ellentétes irány
      placements: [],
      deckHistory: [cardHistroy],
    };
    return CardData;
  }

  private cardToCode(card: Card): string {
    const colorCode = card.color[0].toUpperCase();
    let symbolCode = card.symbol.toUpperCase();

    if (card.color === 'black') {
      return symbolCode === 'PLUS4' ? 'WP' : 'WC';
    }
    symbolCode = symbolCode === "PLUS2" ? 'K' : symbolCode;
    symbolCode = symbolCode === "REVERSE" ? 'R' : symbolCode;
    symbolCode = symbolCode === "SKIP" ? 'S' : symbolCode;

    return colorCode + symbolCode;
  }
}
