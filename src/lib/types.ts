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

export type BlindCardPosition = 5 | 6 | 7 | 8;

export interface SeatPlayer {
  uid: string;
  name: string;
  isBot: boolean;
  online: boolean;
  joinedAt: number;
  // Persistent machine/device identity for exclusive reconnect & 15s bot takeover
  deviceId?: string | null;
  disconnectedAt?: number | null;
  botTakeover?: boolean;
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

export interface RevokeInfo {
  offendingSeat: SeatIndex;
  offendingTeam: TeamId;
  winningTeam: TeamId;
  ledSuit: Suit;
  playedCard: Card;
  heldMatchingCard: Card;
}

export interface HandResult {
  handNumber: number;
  trumpSuit: Suit;
  trumpCaller: SeatIndex;
  trumpTeam: TeamId;
  tricksWon: Record<TeamId, number>;
  winnerTeam: TeamId | "TIE";
  outcomeType:
    | "NORMAL_TRUMP"
    | "NORMAL_NON_TRUMP"
    | "KAPOTHI"
    | "SEPORU"
    | "REVOKE";
  baseTokens: number;
  bonusTokensApplied: number;
  totalTokensAwarded: number;
  nextCarryOverBonus: number;
  revokeInfo?: RevokeInfo;
}

export type GamePhase =
  | "SELECT_TRUMP"
  | "REVEAL_TRUMP_CARD"
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
  revealedTrumpCard: Card | null; // set when trumpCaller picks 5th/6th/7th/8th blind card
  revealedTrumpCardPosition: BlindCardPosition | null;
  currentTurn: SeatIndex;
  turnStartedAt: number;
  trickNumber: number; // 1..8
  trickLeader: SeatIndex;
  currentTrick: TrickPlay[];
  lastTrickWinner: SeatIndex | null;
  lastTrickWinningCardId: string | null;
  lastTrickCut: boolean;
  hands: Record<string, Card[]>; // seat index "0".."3" -> cards currently in hand
  pendingSecondDeal: Record<string, Card[]> | null; // remaining cards before trump deal completes
  wonTricksBySeat: Record<string, Card[][]>; // tricks won by each seat in the current hand
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
  | "goodGame"
  | "trustMe"
  | "noTrumps"
  | "aceComing"
  | "oops"
  | "haha"
  | "danger"
  | "bigBrain"
  | "rematch";

export type MemeId =
  | "asiyath"
  | "ado"
  | "ammatahudu"
  | "heyyy"
  | "kanawa"
  | "kaputu";

export interface MemeEvent {
  id: string;
  seat: SeatIndex;
  senderName: string;
  memeId: MemeId;
  timestamp: number;
}

export interface RoomData {
  code: string;
  hostUid: string;
  status: "lobby" | "playing" | "finished";
  createdAt: number;
  updatedAt: number;
  finishedAt?: number | null;
  settings: RoomSettings;
  seats: Record<string, SeatPlayer | null>; // keys "0", "1", "2", "3"
  game: GameState | null;
  emotes?: Record<string, EmoteEvent>;
  activeMeme?: MemeEvent | null;
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
