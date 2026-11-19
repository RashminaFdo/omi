import type {
  Card,
  GameState,
  HandResult,
  Rank,
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

/**
 * Team A: Seats 0 & 2 (partners across the table)
 * Team B: Seats 1 & 3 (partners across the table)
 */
export function getTeam(seat: SeatIndex): TeamId {
  return seat === 0 || seat === 2 ? "A" : "B";
}

export function getPartnerSeat(seat: SeatIndex): SeatIndex {
  return ((seat + 2) % 4) as SeatIndex;
}

/**
 * Counter-clockwise turn & dealing direction:
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
 * Deal a new Omi hand in Stage 1:
 * - 4 cards dealt counter-clockwise starting from dealer's right (trumpCaller)
 * - Remaining 4 cards stored in pendingSecondDeal until trumpSuit is selected
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

  const stage1: Record<string, Card[]> = { "0": [], "1": [], "2": [], "3": [] };
  const stage2: Record<string, Card[]> = { "0": [], "1": [], "2": [], "3": [] };

  // Deal 4 cards to each player counter-clockwise starting from dealer's right
  let idx = 0;
  let seat = trumpCaller;
  for (let p = 0; p < 4; p++) {
    stage1[String(seat)] = sortHand(deck.slice(idx, idx + 4));
    idx += 4;
    seat = nextSeatCCW(seat);
  }

  // Reserve second 4 cards per player
  seat = trumpCaller;
  for (let p = 0; p < 4; p++) {
    stage2[String(seat)] = deck.slice(idx, idx + 4);
    idx += 4;
    seat = nextSeatCCW(seat);
  }

  return {
    phase: "SELECT_TRUMP",
    handNumber: params.handNumber,
    dealerSeat: params.dealerSeat,
    trumpCaller,
    trumpSuit: null,
    currentTurn: trumpCaller,
    turnStartedAt: params.now ?? Date.now(),
    trickNumber: 1,
    trickLeader: trumpCaller,
    currentTrick: [],
    lastTrickWinner: null,
    lastTrickWinningCardId: null,
    lastTrickCut: false,
    hands: stage1,
    pendingSecondDeal: stage2,
    tricksWon: { A: 0, B: 0 },
    scores: { ...params.scores },
    carryOverBonus: params.carryOverBonus,
    lastHandResult: null,
    matchWinner: null,
    actionSeq: params.actionSeq + 1,
  };
}

/**
 * Stage 2: Once trumpCaller chooses trumpSuit from their initial 4 cards,
 * deal the remaining 4 cards to every player (8 cards total each) and begin trick 1.
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

  const mergedHands: Record<string, Card[]> = {};
  for (const s of ["0", "1", "2", "3"]) {
    const first4 = state.hands?.[s] ?? [];
    const second4 = state.pendingSecondDeal?.[s] ?? [];
    mergedHands[s] = sortHand([...first4, ...second4], suit);
  }

  return {
    ...state,
    phase: "PLAYING",
    trumpSuit: suit,
    hands: mergedHands,
    pendingSecondDeal: null,
    currentTurn: state.trumpCaller,
    trickLeader: state.trumpCaller,
    turnStartedAt: now,
    actionSeq: state.actionSeq + 1,
  };
}

/**
 * Strict Sri Lankan Omi follow-suit rule:
 * - If leading (trick empty), all cards in hand are legal.
 * - If holding at least one card of the led suit, ONLY cards of the led suit are legal.
 * - If void in led suit, ANY card in hand is legal (cut with trump or discard).
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
 * Apply a single card play.
 * If it's the 4th card of the trick, transitions to TRICK_COMPLETE so clients can
 * display the winning highlight & collect animation before advanceAfterTrick().
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

  if (!isLegalPlay(hand, cardId, trick)) {
    throw new Error("Illegal card play: must follow led suit if able.");
  }

  const playedCard = hand.find((c) => c.id === cardId)!;
  const remainingHand = hand.filter((c) => c.id !== cardId);

  const ledSuit = trick.length > 0 ? trick[0].card.suit : null;
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
 * Rotate dealer counter-clockwise and deal the next hand.
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

export function chooseBotTrumpSuit(initialFourCards: Card[]): Suit {
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
    // Length + high-card strength
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
  return bestSuit;
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
    // Prefer Aces/Kings in non-trump suits to cash winners early
    const nonTrumpHigh = byRankDesc.find(
      (c) => c.suit !== trumpSuit && (c.rank === "A" || c.rank === "K")
    );
    if (nonTrumpHigh) return nonTrumpHigh;

    // If bot has 3+ trumps including Ace or King, draw out enemy trumps
    const trumps = byRankDesc.filter((c) => c.suit === trumpSuit);
    if (trumps.length >= 3 && (trumps[0].rank === "A" || trumps[0].rank === "K")) {
      return trumps[0];
    }

    // Otherwise lead lowest non-trump card (preserving trumps for cutting)
    const nonTrumps = byRankAsc.filter((c) => c.suit !== trumpSuit);
    if (nonTrumps.length > 0) return nonTrumps[0];

    return byRankAsc[0];
  }

  // Following or void
  const currentWinner = determineTrickWinner(currentTrick, trumpSuit);
  const partnerSeat = getPartnerSeat(botSeat);
  const partnerWinning = currentWinner.seat === partnerSeat;
  const isLastToPlay = currentTrick.length === 3;

  // Check if partner is safely winning (last player or holds Ace of trump / Ace of led suit)
  const partnerLikelySafe =
    partnerWinning &&
    (isLastToPlay ||
      (currentWinner.card.suit === trumpSuit &&
        RANK_VALUE[currentWinner.card.rank] >= RANK_VALUE["K"]) ||
      (currentWinner.card.suit === currentTrick[0].card.suit &&
        currentWinner.card.rank === "A"));

  if (partnerLikelySafe) {
    // Dump lowest non-trump if possible
    const nonTrumps = byRankAsc.filter((c) => c.suit !== trumpSuit);
    return nonTrumps.length > 0 ? nonTrumps[0] : byRankAsc[0];
  }

  // Find cards that beat the current winning play
  const winningCandidates = byRankAsc.filter((card) => {
    const simulated: TrickPlay[] = [
      ...currentTrick,
      { seat: botSeat, card },
    ];
    return determineTrickWinner(simulated, trumpSuit).seat === botSeat;
  });

  if (winningCandidates.length > 0) {
    // Prefer winning without spending trump if following suit can win
    const nonTrumpWinners = winningCandidates.filter(
      (c) => c.suit !== trumpSuit
    );
    if (nonTrumpWinners.length > 0) {
      // Win cheaply if last player, otherwise play strong card if mid-trick
      return isLastToPlay
        ? nonTrumpWinners[0]
        : nonTrumpWinners[nonTrumpWinners.length - 1];
    }

    // Cut (Kapanawa) with the cheapest winning trump card!
    return winningCandidates[0];
  }

  // Cannot win trick: discard lowest non-trump card, or lowest card overall
  const nonTrumps = byRankAsc.filter((c) => c.suit !== trumpSuit);
  return nonTrumps.length > 0 ? nonTrumps[0] : byRankAsc[0];
}
