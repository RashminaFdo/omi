export type Suit = "S" | "H" | "D" | "C";

export type Rank = "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  id: string; // e.g., "AS", "10H"
  suit: Suit;
  rank: Rank;
}

export type SeatIndex = 0 | 1 | 2 | 3;

export type TeamId = "A" | "B";

export type KapothiLabel = "kapothi" | "basthe";

export type TurnTimerOption = 0 | 15 | 30 | 45;

export interface SeatPlayer {
  uid: string;
  name: string;
  isBot: boolean;
  online: boolean;
  joinedAt: number;
}

export interface RoomSettings {
  turnTimer: TurnTimerOption; // seconds, 0 = off
  kapothiLabel: KapothiLabel;
}

export interface TrickPlay {
  seat: SeatIndex;
  card: Card;
  isCut?: boolean;
}

export interface HandResult {
  handNumber: number;
  trumpSuit: Suit;
  trumpCaller: SeatIndex;
  trumpTeam: TeamId;
  tricksWon: Record<TeamId, number>;
  winnerTeam: TeamId | "TIE";
  outcomeType: "NORMAL_TRUMP" | "NORMAL_NON_TRUMP" | "KAPOTHI" | "SEPORU";
  baseTokens: number;
  bonusTokensApplied: number;
  totalTokensAwarded: number;
  nextCarryOverBonus: number;
}

export type GamePhase =
  | "SELECT_TRUMP"
  | "PLAYING"
  | "TRICK_COMPLETE"
  | "HAND_SUMMARY"
  | "GAME_OVER";

export interface GameState {
  phase: GamePhase;
  handNumber: number;
  dealerSeat: SeatIndex;
  trumpCaller: SeatIndex;
  trumpSuit: Suit | null;
  currentTurn: SeatIndex;
  turnStartedAt: number;
  trickNumber: number; // 1..8
  trickLeader: SeatIndex;
  currentTrick: TrickPlay[];
  lastTrickWinner: SeatIndex | null;
  lastTrickWinningCardId: string | null;
  lastTrickCut: boolean;
  hands: Record<string, Card[]>; // seat index "0".."3" -> cards currently in hand
  pendingSecondDeal: Record<string, Card[]> | null; // remaining 4 cards per seat before trump chosen
  tricksWon: Record<TeamId, number>;
  scores: Record<TeamId, number>; // Keta tokens, first to 10 wins
  carryOverBonus: number; // Seporu bonus stack
  lastHandResult: HandResult | null;
  matchWinner: TeamId | null;
  actionSeq: number; // monotonic counter for sound & sync dedupe
}

export interface EmoteEvent {
  id: string;
  seat: SeatIndex;
  emoteKey: EmoteKey;
  timestamp: number;
}

export type EmoteKey =
  | "niceCut"
  | "kapothiIncoming"
  | "seporu"
  | "wellPlayed"
  | "hurryUp"
  | "goodGame";

export interface RoomData {
  code: string;
  hostUid: string;
  status: "lobby" | "playing" | "finished";
  createdAt: number;
  updatedAt: number;
  settings: RoomSettings;
  seats: Record<string, SeatPlayer | null>; // keys "0", "1", "2", "3"
  game: GameState | null;
  emotes?: Record<string, EmoteEvent>;
}

export type Language = "en" | "si";
export type AnimationSpeed = "normal" | "fast";
export type FeltTheme = "emerald" | "navy" | "slate";
export type CardBackDesign = "crimson" | "gold" | "sapphire";

export interface UserPreferences {
  language: Language;
  soundEnabled: boolean;
  volume: number; // 0..1
  animationSpeed: AnimationSpeed;
  feltTheme: FeltTheme;
  cardBack: CardBackDesign;
  nickname: string;
}
