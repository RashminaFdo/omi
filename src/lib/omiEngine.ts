import type {
  BlindCardPosition,
  Card,
  GameState,
  HandResult,
  Rank,
  RevokeInfo,
  SeatIndex,
  Suit,
  TeamId,
  TrickPlay,
} from "./types";

export const SUITS: readonly Suit[] = ["S", "H", "D", "C"] as const;

export const RANKS: readonly Rank[] = [
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
] as const;

export const RANK_VALUE: Record<Rank, number> = {
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export const SUIT_ORDER: Record<Suit, number> = {
  S: 0,
  H: 1,
  C: 2,
  D: 3,
};

export const TARGET_TOKENS = 10;
export const TOTAL_KETA_TOKENS = 20;
export const REVOKE_PENALTY_TOKENS = 2;

/**
 * Team A: Seats 0 & 2 (partners across the table)
 * Team B: Seats 1 & 3 (partners across the table)
 */
export function getTeam(seat: SeatIndex): TeamId {
  return seat === 0 || seat === 2 ? "A" : "B";
}

export function getOpposingTeam(team: TeamId): TeamId {
  return team === "A" ? "B" : "A";
}

export function getPartnerSeat(seat: SeatIndex): SeatIndex {
  return ((seat + 2) % 4) as SeatIndex;
}

/**
 * Counter-clockwise (anti-clockwise) turn & dealing direction:
 * Seat 0 (Bottom) -> Seat 1 (Right) -> Seat 2 (Top) -> Seat 3 (Left) -> Seat 0
 */
export function nextSeatCCW(seat: SeatIndex): SeatIndex {
  return ((seat + 1) % 4) as SeatIndex;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}${suit}`, suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(cards: Card[]): Card[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sortHand(cards: Card[], trumpSuit: Suit | null = null): Card[] {
  return [...cards].sort((a, b) => {
    if (trumpSuit) {
      const aIsTrump = a.suit === trumpSuit;
      const bIsTrump = b.suit === trumpSuit;
      if (aIsTrump && !bIsTrump) return -1;
      if (!aIsTrump && bIsTrump) return 1;
    }
    if (a.suit !== b.suit) {
      return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    }
    return RANK_VALUE[b.rank] - RANK_VALUE[a.rank];
  });
}

/**
 * Fair-Play Trump Strength Rule:
 * A player's trump hand is considered too weak to play if:
 * - They have 0 trump cards, OR
 * - They have 2 or fewer trump cards AND all of them are strictly below Jack (10, 9, 8, 7).
 */
export function isPlayerTrumpWeak(hand: Card[], trumpSuit: Suit): boolean {
  const trumps = hand.filter((c) => c.suit === trumpSuit);
  if (trumps.length === 0) return true;
  if (trumps.length <= 2) {
    return trumps.every((c) => RANK_VALUE[c.rank] < RANK_VALUE["J"]);
  }
  return false;
}

/**
 * A team (Seats 0 & 2 for Team A, Seats 1 & 3 for Team B) can play the hand
 * if AT LEAST ONE teammate has a playable trump holding (not weak).
 * If one teammate has no trumps, it is completely fine as long as their partner can play!
 */
export function isTeamPlayableForTrump(
  seat1Hand: Card[],
  seat2Hand: Card[],
  trumpSuit: Suit
): boolean {
  return (
    !isPlayerTrumpWeak(seat1Hand, trumpSuit) ||
    !isPlayerTrumpWeak(seat2Hand, trumpSuit)
  );
}

/**
 * Randomly deals the remaining unseen cards (preserving any already-seen cards like
 * the selector's first 4 cards and any revealed blind 5th-8th card) while guaranteeing
 * BOTH teams have a fair, playable trump distribution.
 */
function dealRemainingHandsFairly(
  fixedHands: Record<string, Card[]>,
  unseenPool: Card[],
  trumpSuit: Suit
): Record<string, Card[]> {
  const buildFromPool = (pool: Card[]): Record<string, Card[]> => {
    const result: Record<string, Card[]> = {};
    let idx = 0;
    for (const s of ["0", "1", "2", "3"]) {
      const fixed = fixedHands[s] ?? [];
      const need = Math.max(0, 8 - fixed.length);
      result[s] = sortHand([...fixed, ...pool.slice(idx, idx + need)], trumpSuit);
      idx += need;
    }
    return result;
  };

  // Try up to 80 random Fisher-Yates shuffles of the unseen pool until BOTH teams are playable
  let candidate = buildFromPool(shuffleDeck(unseenPool));
  for (let attempt = 0; attempt < 80; attempt++) {
    const teamAOk = isTeamPlayableForTrump(
      candidate["0"],
      candidate["2"],
      trumpSuit
    );
    const teamBOk = isTeamPlayableForTrump(
      candidate["1"],
      candidate["3"],
      trumpSuit
    );
    if (teamAOk && teamBOk) {
      return candidate;
    }
    candidate = buildFromPool(shuffleDeck(unseenPool));
  }

  return candidate;
}

/**
 * Authentic Sri Lankan Omi Stage 1 Deal:
 * - Shuffles 32-card deck.
 * - Deals ONLY the first 4 cards to the Trump Selector (dealer's anti-clockwise right).
 * - Reserves the selector's 5th, 6th, 7th, and 8th cards (in exact deck order)
 *   AND all 8 cards for each of the other 3 players in pendingSecondDeal.
 * - Everyone else receives their cards only after Trump is decided!
 */
export function createHandState(params: {
  handNumber: number;
  dealerSeat: SeatIndex;
  scores: Record<TeamId, number>;
  carryOverBonus: number;
  actionSeq: number;
  now?: number;
}): GameState {
  const deck = shuffleDeck(createDeck());
  const trumpCaller = nextSeatCCW(params.dealerSeat);

  const stage1Hands: Record<string, Card[]> = {
    "0": [],
    "1": [],
    "2": [],
    "3": [],
  };
  const pending: Record<string, Card[]> = {
    "0": [],
    "1": [],
    "2": [],
    "3": [],
  };

  // Deal first 4 cards ONLY to the trump selector
  stage1Hands[String(trumpCaller)] = sortHand(deck.slice(0, 4));

  // Reserve 5th, 6th, 7th, 8th cards for trump selector (preserve exact order!)
  pending[String(trumpCaller)] = deck.slice(4, 8);

  // Reserve 8 cards each for the remaining 3 players in counter-clockwise order
  let idx = 8;
  let seat = nextSeatCCW(trumpCaller);
  for (let p = 0; p < 3; p++) {
    pending[String(seat)] = deck.slice(idx, idx + 8);
    idx += 8;
    seat = nextSeatCCW(seat);
  }

  return {
    phase: "SELECT_TRUMP",
    handNumber: params.handNumber,
    dealerSeat: params.dealerSeat,
    trumpCaller,
    trumpSuit: null,
    revealedTrumpCard: null,
    revealedTrumpCardPosition: null,
    currentTurn: trumpCaller,
    turnStartedAt: params.now ?? Date.now(),
    trickNumber: 1,
    trickLeader: trumpCaller,
    currentTrick: [],
    lastTrickWinner: null,
    lastTrickWinningCardId: null,
    lastTrickCut: false,
    hands: stage1Hands,
    pendingSecondDeal: pending,
    wonTricksBySeat: { "0": [], "1": [], "2": [], "3": [] },
    tricksWon: { A: 0, B: 0 },
    scores: { ...params.scores },
    carryOverBonus: params.carryOverBonus,
    lastHandResult: null,
    matchWinner: null,
    actionSeq: params.actionSeq + 1,
  };
}

/**
 * Option A: Trump Selector calls Trump directly from their first 4 cards.
 * Deals remaining 4 cards to selector and all 8 cards to everyone else,
 * then selector leads Trick 1.
 */
export function applyTrumpSelection(
  state: GameState,
  seat: SeatIndex,
  suit: Suit,
  now = Date.now()
): GameState {
  if (state.phase !== "SELECT_TRUMP") {
    throw new Error("Cannot select trump outside SELECT_TRUMP phase.");
  }
  if (seat !== state.trumpCaller) {
    throw new Error("Only the trump caller may choose the trump suit.");
  }

  // Selector's first 4 cards are already seen; randomly deal all 28 unseen cards
  // so BOTH teams have a fair, playable trump holding!
  const fixedHands: Record<string, Card[]> = {
    "0": [...(state.hands?.["0"] ?? [])],
    "1": [...(state.hands?.["1"] ?? [])],
    "2": [...(state.hands?.["2"] ?? [])],
    "3": [...(state.hands?.["3"] ?? [])],
  };
  const unseenPool: Card[] = [];
  for (const s of ["0", "1", "2", "3"]) {
    unseenPool.push(...(state.pendingSecondDeal?.[s] ?? []));
  }

  const mergedHands = dealRemainingHandsFairly(fixedHands, unseenPool, suit);

  return {
    ...state,
    phase: "PLAYING",
    trumpSuit: suit,
    revealedTrumpCard: null,
    revealedTrumpCardPosition: null,
    hands: mergedHands,
    pendingSecondDeal: null,
    currentTurn: state.trumpCaller,
    trickLeader: state.trumpCaller,
    turnStartedAt: now,
    actionSeq: state.actionSeq + 1,
  };
}

/**
 * Option B: Trump Selector dislikes their first 4 cards and chooses the 5th, 6th, 7th, or 8th card.
 * The dealer reveals ONLY that single selected card to all players and declares its suit as Trump.
 * Enters REVEAL_TRUMP_CARD phase before dealing everyone's full 8 cards.
 */
export function applyBlindTrumpCardSelection(
  state: GameState,
  seat: SeatIndex,
  position: BlindCardPosition,
  now = Date.now()
): GameState {
  if (state.phase !== "SELECT_TRUMP") {
    throw new Error("Cannot pick a blind trump card outside SELECT_TRUMP phase.");
  }
  if (seat !== state.trumpCaller) {
    throw new Error("Only the trump caller may choose a blind trump card.");
  }

  const selectorPending = state.pendingSecondDeal?.[String(seat)] ?? [];
  const cardIndex = position - 5; // 5->0, 6->1, 7->2, 8->3
  const selectedCard = selectorPending[cardIndex];
  if (!selectedCard) {
    throw new Error("Selected blind card position is unavailable.");
  }

  return {
    ...state,
    phase: "REVEAL_TRUMP_CARD",
    trumpSuit: selectedCard.suit,
    revealedTrumpCard: selectedCard,
    revealedTrumpCardPosition: position,
    turnStartedAt: now,
    actionSeq: state.actionSeq + 1,
  };
}

/**
 * After everyone has seen the revealed 5th/6th/7th/8th trump card,
 * deal all remaining unseen cards fairly (keeping selector's first 4 + revealed card fixed!)
 * so BOTH teams have a fair, playable trump holding, then start Trick 1.
 */
export function finalizeBlindTrumpDeal(
  state: GameState,
  now = Date.now()
): GameState {
  if (state.phase !== "REVEAL_TRUMP_CARD" || !state.trumpSuit) {
    return state;
  }

  const callerKey = String(state.trumpCaller);
  const revealed = state.revealedTrumpCard;

  const fixedHands: Record<string, Card[]> = {
    "0": [...(state.hands?.["0"] ?? [])],
    "1": [...(state.hands?.["1"] ?? [])],
    "2": [...(state.hands?.["2"] ?? [])],
    "3": [...(state.hands?.["3"] ?? [])],
  };

  if (revealed && !fixedHands[callerKey].some((c) => c.id === revealed.id)) {
    fixedHands[callerKey].push(revealed);
  }

  const unseenPool: Card[] = [];
  for (const s of ["0", "1", "2", "3"]) {
    const rest = state.pendingSecondDeal?.[s] ?? [];
    for (const c of rest) {
      if (revealed && c.id === revealed.id) continue;
      unseenPool.push(c);
    }
  }

  const mergedHands = dealRemainingHandsFairly(
    fixedHands,
    unseenPool,
    state.trumpSuit
  );

  return {
    ...state,
    phase: "PLAYING",
    hands: mergedHands,
    pendingSecondDeal: null,
    currentTurn: state.trumpCaller,
    trickLeader: state.trumpCaller,
    turnStartedAt: now,
    actionSeq: state.actionSeq + 1,
  };
}

/**
 * Returns cards that strictly follow the led suit (used by AI bots and revoke detection).
 * Note: Human players are NOT blocked in the UI — they may play any card in their hand,
 * and failing to follow suit while holding the led suit triggers a Revoke loss!
 */
export function getLegalCards(hand: Card[], currentTrick: TrickPlay[]): Card[] {
  if (!hand || hand.length === 0) return [];
  if (!currentTrick || currentTrick.length === 0) return hand;

  const ledSuit = currentTrick[0].card.suit;
  const matching = hand.filter((c) => c.suit === ledSuit);
  return matching.length > 0 ? matching : hand;
}

export function isLegalPlay(
  hand: Card[],
  cardId: string,
  currentTrick: TrickPlay[]
): boolean {
  return getLegalCards(hand, currentTrick).some((c) => c.id === cardId);
}

/**
 * Determines which play currently wins the trick:
 * - Highest trump card wins if any trump was played.
 * - Otherwise, highest card of the led suit wins.
 */
export function determineTrickWinner(
  trick: TrickPlay[],
  trumpSuit: Suit
): TrickPlay {
  if (!trick || trick.length === 0) {
    throw new Error("Cannot determine winner of an empty trick.");
  }

  const ledSuit = trick[0].card.suit;
  let winner = trick[0];

  for (let i = 1; i < trick.length; i++) {
    const play = trick[i];
    const playIsTrump = play.card.suit === trumpSuit;
    const winnerIsTrump = winner.card.suit === trumpSuit;

    if (playIsTrump && !winnerIsTrump) {
      winner = play;
    } else if (playIsTrump && winnerIsTrump) {
      if (RANK_VALUE[play.card.rank] > RANK_VALUE[winner.card.rank]) {
        winner = play;
      }
    } else if (!playIsTrump && !winnerIsTrump) {
      if (
        play.card.suit === ledSuit &&
        RANK_VALUE[play.card.rank] > RANK_VALUE[winner.card.rank]
      ) {
        winner = play;
      }
    }
  }

  return winner;
}

/**
 * Apply a card play.
 * - Players may play ANY card in their hand (no forced UI restriction).
 * - If a player holds a card of the led suit, yet plays a different suit (including a trump card),
 *   they commit a REVOKE and the opposing team immediately wins the hand!
 * - Otherwise, normal trick play proceeds; on the 4th card, transitions to TRICK_COMPLETE.
 */
export function applyCardPlay(
  state: GameState,
  seat: SeatIndex,
  cardId: string,
  now = Date.now()
): GameState {
  if (state.phase !== "PLAYING") {
    throw new Error("Cards can only be played during PLAYING phase.");
  }
  if (seat !== state.currentTurn) {
    throw new Error("Not this player's turn.");
  }
  if (!state.trumpSuit) {
    throw new Error("Trump suit not set.");
  }

  const seatKey = String(seat);
  const hand = state.hands?.[seatKey] ?? [];
  const trick = state.currentTrick ?? [];

  const playedCard = hand.find((c) => c.id === cardId);
  if (!playedCard) {
    throw new Error("Card is not in this player's hand.");
  }

  const remainingHand = hand.filter((c) => c.id !== cardId);
  const ledSuit = trick.length > 0 ? trick[0].card.suit : null;

  // Check for Revoke (failing to follow led suit while holding a card of that suit)
  if (ledSuit !== null && playedCard.suit !== ledSuit) {
    const heldMatchingCard = hand.find((c) => c.suit === ledSuit);
    if (heldMatchingCard) {
      const offendingTeam = getTeam(seat);
      const winningTeam = getOpposingTeam(offendingTeam);
      const trumpTeam = getTeam(state.trumpCaller);
      const baseTokens = REVOKE_PENALTY_TOKENS;
      const bonusTokensApplied = state.carryOverBonus;
      const totalTokensAwarded = baseTokens + bonusTokensApplied;

      const revokeInfo: RevokeInfo = {
        offendingSeat: seat,
        offendingTeam,
        winningTeam,
        ledSuit,
        playedCard,
        heldMatchingCard,
      };

      const result: HandResult = {
        handNumber: state.handNumber,
        trumpSuit: state.trumpSuit,
        trumpCaller: state.trumpCaller,
        trumpTeam,
        tricksWon: { ...state.tricksWon },
        winnerTeam: winningTeam,
        outcomeType: "REVOKE",
        baseTokens,
        bonusTokensApplied,
        totalTokensAwarded,
        nextCarryOverBonus: 0,
        revokeInfo,
      };

      const updatedScores: Record<TeamId, number> = {
        A: state.scores.A + (winningTeam === "A" ? totalTokensAwarded : 0),
        B: state.scores.B + (winningTeam === "B" ? totalTokensAwarded : 0),
      };

      let matchWinner: TeamId | null = null;
      if (updatedScores.A >= TARGET_TOKENS) {
        matchWinner = "A";
      } else if (updatedScores.B >= TARGET_TOKENS) {
        matchWinner = "B";
      }

      const updatedTrick: TrickPlay[] = [
        ...trick,
        {
          seat,
          card: playedCard,
          isCut: playedCard.suit === state.trumpSuit && ledSuit !== state.trumpSuit,
        },
      ];

      return {
        ...state,
        phase: matchWinner ? "GAME_OVER" : "HAND_SUMMARY",
        hands: {
          ...state.hands,
          [seatKey]: remainingHand,
        },
        currentTrick: updatedTrick,
        scores: updatedScores,
        carryOverBonus: 0,
        lastHandResult: result,
        matchWinner,
        turnStartedAt: now,
        actionSeq: state.actionSeq + 1,
      };
    }
  }

  const isCut =
    ledSuit !== null &&
    ledSuit !== state.trumpSuit &&
    playedCard.suit === state.trumpSuit;

  const updatedTrick: TrickPlay[] = [
    ...trick,
    { seat, card: playedCard, isCut },
  ];

  const updatedHands: Record<string, Card[]> = {
    ...state.hands,
    [seatKey]: remainingHand,
  };

  if (updatedTrick.length < 4) {
    return {
      ...state,
      hands: updatedHands,
      currentTrick: updatedTrick,
      currentTurn: nextSeatCCW(seat),
      turnStartedAt: now,
      lastTrickCut: isCut,
      actionSeq: state.actionSeq + 1,
    };
  }

  // Trick complete (4 cards played)
  const winningPlay = determineTrickWinner(updatedTrick, state.trumpSuit);
  const anyCut = updatedTrick.some((p) => p.isCut);

  return {
    ...state,
    phase: "TRICK_COMPLETE",
    hands: updatedHands,
    currentTrick: updatedTrick,
    lastTrickWinner: winningPlay.seat,
    lastTrickWinningCardId: winningPlay.card.id,
    lastTrickCut: anyCut,
    turnStartedAt: now,
    actionSeq: state.actionSeq + 1,
  };
}

/**
 * Compute Sri Lankan Omi Keta token scoring for a completed 8-trick hand.
 */
export function scoreCompletedHand(params: {
  handNumber: number;
  trumpSuit: Suit;
  trumpCaller: SeatIndex;
  tricksWon: Record<TeamId, number>;
  carryOverBonus: number;
}): HandResult {
  const { handNumber, trumpSuit, trumpCaller, tricksWon, carryOverBonus } =
    params;
  const trumpTeam = getTeam(trumpCaller);

  // Seporu (4-4 tie): 0 tokens awarded now, +1 carry-over bonus stacks for next winning hand
  if (tricksWon.A === 4 && tricksWon.B === 4) {
    return {
      handNumber,
      trumpSuit,
      trumpCaller,
      trumpTeam,
      tricksWon: { ...tricksWon },
      winnerTeam: "TIE",
      outcomeType: "SEPORU",
      baseTokens: 0,
      bonusTokensApplied: 0,
      totalTokensAwarded: 0,
      nextCarryOverBonus: carryOverBonus + 1,
    };
  }

  const winnerTeam: TeamId = tricksWon.A > tricksWon.B ? "A" : "B";
  const winnerTricks = tricksWon[winnerTeam];

  let baseTokens: number;
  let outcomeType: HandResult["outcomeType"];

  if (winnerTricks === 8) {
    // Kapothi / Basthe: winning all 8 tricks awards 3 tokens
    baseTokens = 3;
    outcomeType = "KAPOTHI";
  } else if (winnerTeam === trumpTeam) {
    // Trump-calling team wins 5-7 tricks -> +1 token
    baseTokens = 1;
    outcomeType = "NORMAL_TRUMP";
  } else {
    // Non-trump team wins 5-7 tricks -> +2 tokens
    baseTokens = 2;
    outcomeType = "NORMAL_NON_TRUMP";
  }

  const totalTokensAwarded = baseTokens + carryOverBonus;

  return {
    handNumber,
    trumpSuit,
    trumpCaller,
    trumpTeam,
    tricksWon: { ...tricksWon },
    winnerTeam,
    outcomeType,
    baseTokens,
    bonusTokensApplied: carryOverBonus,
    totalTokensAwarded,
    nextCarryOverBonus: 0,
  };
}

/**
 * Collect the completed trick, award trick point to winning team,
 * and either lead the next trick or score the hand if trick 8 just finished.
 */
export function advanceAfterTrick(
  state: GameState,
  now = Date.now()
): GameState {
  if (state.phase !== "TRICK_COMPLETE" || state.lastTrickWinner === null) {
    return state;
  }

  const winnerSeat = state.lastTrickWinner;
  const winnerTeam = getTeam(winnerSeat);
  const newTricksWon: Record<TeamId, number> = {
    A: state.tricksWon.A + (winnerTeam === "A" ? 1 : 0),
    B: state.tricksWon.B + (winnerTeam === "B" ? 1 : 0),
  };

  // Record the 4 won cards into the winning player's face-down trick stack
  const winnerKey = String(winnerSeat);
  const wonCards = state.currentTrick.map((p) => p.card);
  const updatedWonTricks: Record<string, Card[][]> = {
    "0": [...(state.wonTricksBySeat?.["0"] ?? [])],
    "1": [...(state.wonTricksBySeat?.["1"] ?? [])],
    "2": [...(state.wonTricksBySeat?.["2"] ?? [])],
    "3": [...(state.wonTricksBySeat?.["3"] ?? [])],
  };
  if (wonCards.length > 0) {
    updatedWonTricks[winnerKey] = [...updatedWonTricks[winnerKey], wonCards];
  }

  const totalTricksPlayed = newTricksWon.A + newTricksWon.B;

  if (totalTricksPlayed < 8) {
    return {
      ...state,
      phase: "PLAYING",
      trickNumber: totalTricksPlayed + 1,
      trickLeader: winnerSeat,
      currentTurn: winnerSeat,
      turnStartedAt: now,
      currentTrick: [],
      lastTrickWinner: null,
      lastTrickWinningCardId: null,
      lastTrickCut: false,
      wonTricksBySeat: updatedWonTricks,
      tricksWon: newTricksWon,
      actionSeq: state.actionSeq + 1,
    };
  }

  // Hand completed (all 8 tricks played)
  const result = scoreCompletedHand({
    handNumber: state.handNumber,
    trumpSuit: state.trumpSuit!,
    trumpCaller: state.trumpCaller,
    tricksWon: newTricksWon,
    carryOverBonus: state.carryOverBonus,
  });

  const updatedScores: Record<TeamId, number> = {
    A:
      state.scores.A +
      (result.winnerTeam === "A" ? result.totalTokensAwarded : 0),
    B:
      state.scores.B +
      (result.winnerTeam === "B" ? result.totalTokensAwarded : 0),
  };

  let matchWinner: TeamId | null = null;
  if (updatedScores.A >= TARGET_TOKENS) {
    matchWinner = "A";
  } else if (updatedScores.B >= TARGET_TOKENS) {
    matchWinner = "B";
  }

  return {
    ...state,
    phase: matchWinner ? "GAME_OVER" : "HAND_SUMMARY",
    currentTrick: [],
    lastTrickWinner: null,
    lastTrickWinningCardId: null,
    lastTrickCut: false,
    wonTricksBySeat: updatedWonTricks,
    tricksWon: newTricksWon,
    scores: updatedScores,
    carryOverBonus: result.nextCarryOverBonus,
    lastHandResult: result,
    matchWinner,
    turnStartedAt: now,
    actionSeq: state.actionSeq + 1,
  };
}

/**
 * Rotate dealer (and therefore trump selector!) counter-clockwise and deal the next hand.
 */
export function startNextHand(state: GameState, now = Date.now()): GameState {
  const nextDealer = nextSeatCCW(state.dealerSeat);
  return createHandState({
    handNumber: state.handNumber + 1,
    dealerSeat: nextDealer,
    scores: state.scores,
    carryOverBonus: state.carryOverBonus,
    actionSeq: state.actionSeq,
    now,
  });
}

// ============================================================================
// Smart Legal AI Bot Heuristics
// ============================================================================

export type BotTrumpDecision =
  | { type: "SUIT"; suit: Suit }
  | { type: "BLIND"; position: BlindCardPosition };

export function chooseBotTrumpDecision(initialFourCards: Card[]): BotTrumpDecision {
  const suitScores: Record<Suit, number> = { S: 0, H: 0, D: 0, C: 0 };
  const rankBonus: Record<Rank, number> = {
    A: 5.5,
    K: 3.8,
    Q: 2.6,
    J: 1.8,
    "10": 1.3,
    "9": 0.9,
    "8": 0.6,
    "7": 0.4,
  };

  for (const card of initialFourCards) {
    suitScores[card.suit] += 2.2 + rankBonus[card.rank];
  }

  let bestSuit: Suit = initialFourCards[0]?.suit ?? "S";
  let bestScore = -1;
  for (const suit of SUITS) {
    if (suitScores[suit] > bestScore) {
      bestScore = suitScores[suit];
      bestSuit = suit;
    }
  }

  // If the bot's first 4 cards are weak (no strong suit or high honor), draw blind 5th-8th card!
  if (bestScore < 7.2) {
    const positions: BlindCardPosition[] = [5, 6, 7, 8];
    const picked = positions[Math.floor(Math.random() * positions.length)];
    return { type: "BLIND", position: picked };
  }

  return { type: "SUIT", suit: bestSuit };
}

export function chooseBotTrumpSuit(initialFourCards: Card[]): Suit {
  const decision = chooseBotTrumpDecision(initialFourCards);
  if (decision.type === "SUIT") return decision.suit;
  return initialFourCards[0]?.suit ?? "S";
}

export function chooseBotCard(
  hand: Card[],
  currentTrick: TrickPlay[],
  trumpSuit: Suit,
  botSeat: SeatIndex
): Card {
  const legal = getLegalCards(hand, currentTrick);
  if (legal.length === 1) return legal[0];

  const byRankAsc = [...legal].sort(
    (a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]
  );
  const byRankDesc = [...byRankAsc].reverse();

  // Leading a trick
  if (!currentTrick || currentTrick.length === 0) {
    const nonTrumpHigh = byRankDesc.find(
      (c) => c.suit !== trumpSuit && (c.rank === "A" || c.rank === "K")
    );
    if (nonTrumpHigh) return nonTrumpHigh;

    const trumps = byRankDesc.filter((c) => c.suit === trumpSuit);
    if (
      trumps.length >= 3 &&
      (trumps[0].rank === "A" || trumps[0].rank === "K")
    ) {
      return trumps[0];
    }

    const nonTrumps = byRankAsc.filter((c) => c.suit !== trumpSuit);
    if (nonTrumps.length > 0) return nonTrumps[0];

    return byRankAsc[0];
  }

  // Following or void
  const currentWinner = determineTrickWinner(currentTrick, trumpSuit);
  const partnerSeat = getPartnerSeat(botSeat);
  const partnerWinning = currentWinner.seat === partnerSeat;
  const isLastToPlay = currentTrick.length === 3;

  const partnerLikelySafe =
    partnerWinning &&
    (isLastToPlay ||
      (currentWinner.card.suit === trumpSuit &&
        RANK_VALUE[currentWinner.card.rank] >= RANK_VALUE["K"]) ||
      (currentWinner.card.suit === currentTrick[0].card.suit &&
        currentWinner.card.rank === "A"));

  if (partnerLikelySafe) {
    const nonTrumps = byRankAsc.filter((c) => c.suit !== trumpSuit);
    return nonTrumps.length > 0 ? nonTrumps[0] : byRankAsc[0];
  }

  const winningCandidates = byRankAsc.filter((card) => {
    const simulated: TrickPlay[] = [
      ...currentTrick,
      { seat: botSeat, card },
    ];
    return determineTrickWinner(simulated, trumpSuit).seat === botSeat;
  });

  if (winningCandidates.length > 0) {
    const nonTrumpWinners = winningCandidates.filter(
      (c) => c.suit !== trumpSuit
    );
    if (nonTrumpWinners.length > 0) {
      return isLastToPlay
        ? nonTrumpWinners[0]
        : nonTrumpWinners[nonTrumpWinners.length - 1];
    }
    return winningCandidates[0];
  }

  const nonTrumps = byRankAsc.filter((c) => c.suit !== trumpSuit);
  return nonTrumps.length > 0 ? nonTrumps[0] : byRankAsc[0];
}
