"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Crown,
  Flame,
  MessageSquareHeart,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Trophy,
  WifiOff,
} from "lucide-react";
import { isRedSuit, SUIT_SYMBOL } from "@/lib/i18n";
import { getTeam, SUITS } from "@/lib/omiEngine";
import {
  dealNextHand,
  deleteRoom,
  OFFLINE_TAKEOVER_MS,
  returnRoomToLobby,
  sendTableEmote,
  startMatch,
  submitBlindTrumpCard,
  submitCardPlay,
  submitTrumpChoice,
} from "@/lib/roomService";
import { useSettings } from "@/lib/settings";
import { soundEngine } from "@/lib/sound";
import type {
  BlindCardPosition,
  EmoteKey,
  GameState,
  RoomData,
  SeatIndex,
  Suit,
} from "@/lib/types";
import { KetaTokens } from "./KetaTokens";
import { CardBack, PlayingCard, SuitIcon } from "./PlayingCard";
import { WonTricksPile } from "./WonTricksPile";

interface GameTableProps {
  room: RoomData;
  game: GameState;
  uid: string;
  mySeat: SeatIndex | null;
  onRoomClosed: () => void;
}

const EMOTE_KEYS: EmoteKey[] = [
  "niceCut",
  "kapothiIncoming",
  "seporu",
  "wellPlayed",
  "hurryUp",
  "goodGame",
];

const BLIND_POSITIONS: BlindCardPosition[] = [5, 6, 7, 8];

// Responsive card positions inside center mat by relative seat
// rel 0 = Bottom, rel 1 = Right (anti-clockwise next), rel 2 = Top (Partner), rel 3 = Left
const TRICK_CARD_OFFSET: Record<
  number,
  { x: number; y: number; enterX: number; enterY: number }
> = {
  0: { x: 0, y: 28, enterX: 0, enterY: 110 },
  1: { x: 42, y: 0, enterX: 130, enterY: 0 },
  2: { x: 0, y: -28, enterX: 0, enterY: -110 },
  3: { x: -42, y: 0, enterX: -130, enterY: 0 },
};

export function GameTable({
  room,
  game,
  uid,
  mySeat,
  onRoomClosed,
}: GameTableProps) {
  const { prefs, dict } = useSettings();
  const [submittingSeq, setSubmittingSeq] = useState<number | null>(null);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const submitting = submittingSeq === game.actionSeq;
  const isHost = room.hostUid === uid;
  const baseSeat: SeatIndex = mySeat ?? 0;
  const myTeam = mySeat !== null ? getTeam(mySeat) : null;
  const fast = prefs.animationSpeed === "fast";
  const animDuration = fast ? 0.17 : 0.32;

  const seatAtRel = (rel: 0 | 1 | 2 | 3): SeatIndex =>
    ((baseSeat + rel) % 4) as SeatIndex;

  const relOfSeat = (seat: SeatIndex): 0 | 1 | 2 | 3 =>
    (((seat - baseSeat + 4) % 4) as 0 | 1 | 2 | 3);

  // Tick clock for turn countdown, 15s offline countdown, and emote expiry
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 300);
    return () => window.clearInterval(id);
  }, []);

  // Track emote pop SFX
  const lastEmoteIdsRef = useRef<string>("");
  useEffect(() => {
    const sig = Object.values(room.emotes ?? {})
      .map((e) => e.id)
      .sort()
      .join("|");
    if (lastEmoteIdsRef.current && sig && sig !== lastEmoteIdsRef.current) {
      soundEngine.playEmotePop();
    }
    lastEmoteIdsRef.current = sig;
  }, [room.emotes]);

  // Sound effect triggers driven by actionSeq transitions
  const prevSeqRef = useRef<number>(game.actionSeq);
  const prevPhaseRef = useRef<GameState["phase"]>(game.phase);
  const prevTrickLenRef = useRef<number>(game.currentTrick.length);
  const prevTurnRef = useRef<SeatIndex>(game.currentTurn);

  useEffect(() => {
    if (game.actionSeq === prevSeqRef.current) return;

    if (
      game.phase === "SELECT_TRUMP" &&
      prevPhaseRef.current !== "SELECT_TRUMP"
    ) {
      soundEngine.playCardDeal();
      if (mySeat !== null && game.trumpCaller === mySeat) {
        setTimeout(() => soundEngine.playTurnChime(), 300);
      }
    } else if (
      game.phase === "REVEAL_TRUMP_CARD" &&
      prevPhaseRef.current !== "REVEAL_TRUMP_CARD"
    ) {
      soundEngine.playCardFlip();
      soundEngine.playTrumpCall();
    } else if (
      game.phase === "PLAYING" &&
      (prevPhaseRef.current === "SELECT_TRUMP" ||
        prevPhaseRef.current === "REVEAL_TRUMP_CARD")
    ) {
      if (prevPhaseRef.current === "SELECT_TRUMP") {
        soundEngine.playTrumpCall();
      }
      setTimeout(() => soundEngine.playCardDeal(), 180);
    } else if (game.currentTrick.length > prevTrickLenRef.current) {
      const latestPlay = game.currentTrick[game.currentTrick.length - 1];
      soundEngine.playCardSlap(Boolean(latestPlay?.isCut));
    } else if (
      game.phase === "PLAYING" &&
      prevPhaseRef.current === "TRICK_COMPLETE"
    ) {
      const winnerTeam = getTeam(game.trickLeader);
      soundEngine.playTrickWin(myTeam === null ? true : winnerTeam === myTeam);
    } else if (
      (game.phase === "HAND_SUMMARY" || game.phase === "GAME_OVER") &&
      prevPhaseRef.current !== game.phase
    ) {
      const res = game.lastHandResult;
      if (res?.outcomeType === "REVOKE") {
        soundEngine.playRevokeAlarm();
      } else if (res?.outcomeType === "KAPOTHI" || game.phase === "GAME_OVER") {
        soundEngine.playKapothiFanfare();
      } else if (res?.outcomeType === "SEPORU") {
        soundEngine.playSeporu();
      } else {
        soundEngine.playTrickWin(
          myTeam === null ? true : res?.winnerTeam === myTeam
        );
      }
    }

    // Gentle chime + mobile haptic tap when it becomes your turn
    if (
      mySeat !== null &&
      game.phase === "PLAYING" &&
      game.currentTurn === mySeat &&
      (prevTurnRef.current !== mySeat || prevPhaseRef.current !== "PLAYING")
    ) {
      soundEngine.playTurnChime();
    }

    prevSeqRef.current = game.actionSeq;
    prevPhaseRef.current = game.phase;
    prevTrickLenRef.current = game.currentTrick.length;
    prevTurnRef.current = game.currentTurn;
  }, [game, myTeam, mySeat]);

  const myHand = useMemo(
    () => game.hands[String(baseSeat)] ?? [],
    [game.hands, baseSeat]
  );

  const isMyPlayTurn =
    mySeat !== null &&
    game.phase === "PLAYING" &&
    game.currentTurn === mySeat;

  const isMyTrumpTurn =
    mySeat !== null &&
    game.phase === "SELECT_TRUMP" &&
    game.trumpCaller === mySeat;

  const timerSeconds = room.settings.turnTimer;
  const remainingSeconds =
    timerSeconds > 0
      ? Math.max(
          0,
          Math.ceil(timerSeconds - (nowTs - game.turnStartedAt) / 1000)
        )
      : null;

  const isMatchPoint = game.scores.A >= 8 || game.scores.B >= 8;

  const handleSelectTrump = async (suit: Suit) => {
    if (!isMyTrumpTurn || submitting || mySeat === null) return;
    setSubmittingSeq(game.actionSeq);
    try {
      await submitTrumpChoice(room.code, mySeat, suit);
    } catch {
      setSubmittingSeq(null);
    }
  };

  const handleSelectBlindTrump = async (position: BlindCardPosition) => {
    if (!isMyTrumpTurn || submitting || mySeat === null) return;
    setSubmittingSeq(game.actionSeq);
    try {
      soundEngine.playCardFlip();
      await submitBlindTrumpCard(room.code, mySeat, position);
    } catch {
      setSubmittingSeq(null);
    }
  };

  const handlePlayCard = async (cardId: string) => {
    if (!isMyPlayTurn || submitting || mySeat === null) return;
    setSubmittingSeq(game.actionSeq);
    try {
      await submitCardPlay(room.code, mySeat, cardId);
    } catch {
      setSubmittingSeq(null);
    }
  };

  const handleEmote = async (key: EmoteKey) => {
    if (mySeat === null) return;
    setEmoteOpen(false);
    soundEngine.playClick();
    await sendTableEmote(room.code, mySeat, key);
  };

  const handleCloseFinishedRoom = async () => {
    soundEngine.playClick();
    await deleteRoom(room.code).catch(() => {});
    onRoomClosed();
  };

  const getActiveEmote = (seat: SeatIndex) => {
    const ev = room.emotes?.[String(seat)];
    if (!ev) return null;
    if (nowTs - ev.timestamp > 4500) return null;
    return ev;
  };

  // Directional exit target when a trick finishes and slides to the winning player
  const trickWinnerExit = useMemo(() => {
    if (game.lastTrickWinner === null) return { x: 0, y: 0 };
    const rel = (((game.lastTrickWinner - baseSeat + 4) % 4) as 0 | 1 | 2 | 3);
    const map: Record<number, { x: number; y: number }> = {
      0: { x: 0, y: 150 },
      1: { x: 170, y: 0 },
      2: { x: 0, y: -150 },
      3: { x: -170, y: 0 },
    };
    return map[rel];
  }, [game.lastTrickWinner, baseSeat]);

  const renderSeatBadge = (rel: 0 | 1 | 2 | 3) => {
    const seat = seatAtRel(rel);
    const player = room.seats[String(seat)];
    if (!player) return null;

    const team = getTeam(seat);
    const isTurn =
      (game.phase === "PLAYING" && game.currentTurn === seat) ||
      (game.phase === "SELECT_TRUMP" && game.trumpCaller === seat);
    const isDealer = game.dealerSeat === seat;
    const isTrumpCaller = game.trumpCaller === seat;
    const cardCount = game.hands[String(seat)]?.length ?? 0;
    const wonTricks = game.wonTricksBySeat?.[String(seat)] ?? [];
    const emote = getActiveEmote(seat);
    const isPartner = mySeat !== null && rel === 2;

    const isOfflineHuman = !player.isBot && !player.online;
    const offlineSecsLeft =
      isOfflineHuman && !player.botTakeover && player.disconnectedAt
        ? Math.max(
            0,
            Math.ceil(
              (OFFLINE_TAKEOVER_MS - (nowTs - player.disconnectedAt)) / 1000
            )
          )
        : null;

    const placement: "bottom" | "top" | "left" | "right" =
      rel === 0 ? "bottom" : rel === 1 ? "right" : rel === 2 ? "top" : "left";

    return (
      <div className="relative flex flex-col items-center gap-1">
        {/* Floating Emote Bubble */}
        <AnimatePresence>
          {emote ? (
            <motion.div
              key={emote.id}
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.85 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-full bg-amber-300 px-2.5 py-1 text-[11px] sm:text-xs font-extrabold text-slate-950 shadow-xl"
            >
              {dict.emotes[emote.emoteKey].emoji}{" "}
              {dict.emotes[emote.emoteKey].label}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Opponent / Partner Card Backs + Won Tricks Pile side-by-side */}
        {rel !== 0 ? (
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-h-[38px] sm:min-h-[44px]">
            {cardCount > 0 ? (
              <div className="flex items-center justify-center -space-x-5 sm:-space-x-4">
                {Array.from({ length: cardCount }).map((_, idx) => (
                  <CardBack
                    key={idx}
                    design={prefs.cardBack}
                    size="xs"
                    className="shadow-md"
                  />
                ))}
              </div>
            ) : null}

            <WonTricksPile
              tricks={wonTricks}
              trumpSuit={game.trumpSuit}
              placement={placement}
            />
          </div>
        ) : null}

        {/* Player Pill */}
        <div
          className={`relative flex items-center gap-1.5 sm:gap-2 rounded-2xl px-2 sm:px-3 py-1 sm:py-1.5 border backdrop-blur-md transition-all ${
            isOfflineHuman
              ? "bg-rose-950/70 border-rose-400/60"
              : isTurn
              ? "bg-amber-400/20 border-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.45)] scale-[1.03]"
              : "bg-black/45 border-white/15"
          }`}
        >
          <span
            className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${
              team === "A"
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                : "bg-slate-200 ring-1 ring-slate-500"
            }`}
          />

          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[11px] sm:text-sm font-bold text-white truncate max-w-[68px] sm:max-w-[115px]">
                {player.name}
              </span>
              {player.isBot ? (
                <Bot className="w-3 h-3 text-amber-300 shrink-0" />
              ) : player.botTakeover ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-amber-400/25 border border-amber-400/50 px-1 py-0.2 text-[9px] font-black text-amber-200 shrink-0">
                  <Bot className="w-2.5 h-2.5" />
                  {dict.botTakeoverBadge}
                </span>
              ) : isOfflineHuman ? (
                <WifiOff className="w-3 h-3 text-rose-400 animate-pulse shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-white/60">
              <span>{team === "A" ? dict.teamA : dict.teamB}</span>
              {isPartner ? (
                <span className="text-emerald-300 font-semibold hidden xs:inline">
                  • {dict.partnerBadge}
                </span>
              ) : null}
              {isDealer ? (
                <span
                  title={dict.dealer}
                  className="rounded bg-white/15 px-1 font-bold text-white/90"
                >
                  D
                </span>
              ) : null}
              {isTrumpCaller ? (
                <span
                  title={dict.trumpCaller}
                  className="text-amber-300 font-bold"
                >
                  ★
                </span>
              ) : null}
            </div>
          </div>

          {/* Turn Countdown Pill */}
          {isTurn && remainingSeconds !== null ? (
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black tabular-nums ${
                remainingSeconds <= 5
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-amber-400 text-slate-950"
              }`}
            >
              {remainingSeconds}s
            </span>
          ) : null}
        </div>

        {/* 15s Offline Countdown Alert Pill */}
        {isOfflineHuman && !player.botTakeover && offlineSecsLeft !== null ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-full bg-rose-500/90 px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-white shadow-md whitespace-nowrap"
          >
            {dict.offlineBotIn(offlineSecsLeft)}
          </motion.div>
        ) : null}
      </div>
    );
  };

  const activePlayerName =
    room.seats[
      String(
        game.phase === "SELECT_TRUMP" ? game.trumpCaller : game.currentTurn
      )
    ]?.name ?? "";

  const trickWinnerName =
    game.lastTrickWinner !== null
      ? room.seats[String(game.lastTrickWinner)]?.name ?? ""
      : "";

  const trumpCallerName = room.seats[String(game.trumpCaller)]?.name ?? "";
  const dealerName = room.seats[String(game.dealerSeat)]?.name ?? "";

  const revokeInfo = game.lastHandResult?.revokeInfo;
  const offendingPlayerName = revokeInfo
    ? room.seats[String(revokeInfo.offendingSeat)]?.name ?? ""
    : "";

  // Check if any human player is currently subbed by AI
  const botSubbedPlayer = Object.values(room.seats).find(
    (p) => p && !p.isBot && p.botTakeover
  );

  const myWonTricks = game.wonTricksBySeat?.[String(baseSeat)] ?? [];

  return (
    <div className="relative flex-1 min-h-0 flex flex-col justify-between overflow-hidden px-1.5 sm:px-5 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:pt-1.5 sm:pb-2 select-none">
      {/* Top HUD Row: Keta Tokens | Tricks | Trump Symbol Only */}
      <div className="mx-auto w-full max-w-6xl flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 z-20">
        {/* Desktop full 20-token stack; Mobile compact score chip */}
        <div className="hidden sm:block sm:min-w-[270px]">
          <KetaTokens
            scores={game.scores}
            carryOverBonus={game.carryOverBonus}
            myTeam={myTeam}
            compact
          />
        </div>

        {/* Mobile ultra-compact Keta pill */}
        <div className="sm:hidden glass-panel rounded-xl border border-white/15 px-2.5 py-1.5 flex items-center gap-2 text-xs font-black tabular-nums">
          <span className="flex items-center gap-1 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {game.scores.A}
          </span>
          <span className="text-white/30">:</span>
          <span className="flex items-center gap-1 text-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-200" />
            {game.scores.B}
          </span>
          <span className="text-[10px] font-semibold text-white/45">/10</span>
          {game.carryOverBonus > 0 ? (
            <span className="rounded bg-amber-400/25 px-1 text-[9px] text-amber-200">
              +{game.carryOverBonus}
            </span>
          ) : null}
        </div>

        {/* Right Group: Match Point + Trick Counter + Trump SYMBOL-ONLY Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          {isMatchPoint ? (
            <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-rose-500/25 border border-rose-400/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-200 animate-pulse">
              <Flame className="w-3 h-3" />
              {dict.matchPoint}
            </span>
          ) : null}

          {/* Live Trick Counter */}
          <div className="glass-panel rounded-xl sm:rounded-2xl border border-white/15 px-2.5 sm:px-3 py-1 sm:py-1.5 text-center shadow-lg">
            <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-white/55">
              {dict.hand} #{game.handNumber} • {game.trickNumber}/8
            </div>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black tabular-nums">
              <span className="text-rose-300">{game.tricksWon.A}</span>
              <span className="text-white/30">–</span>
              <span className="text-slate-200">{game.tricksWon.B}</span>
            </div>
          </div>

          {/* Top-of-Game Selected Trump Display — SYMBOL ONLY! */}
          <div className="glass-panel rounded-xl sm:rounded-2xl border border-amber-400/50 bg-amber-400/[0.1] px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-2 shadow-lg">
            {game.trumpSuit ? (
              <>
                <span
                  className={`w-7 h-9 sm:w-9 sm:h-11 rounded-lg bg-gradient-to-br from-white to-[#efeae0] border border-amber-400/75 flex items-center justify-center shadow ${
                    isRedSuit(game.trumpSuit)
                      ? "text-[#c81e32]"
                      : "text-[#171c28]"
                  }`}
                >
                  <SuitIcon
                    suit={game.trumpSuit}
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </span>
                <div className="leading-tight hidden xs:block">
                  <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
                    {dict.trump}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-white">
                    {dict.suits[game.trumpSuit]}
                  </div>
                </div>
              </>
            ) : (
              <div className="leading-tight px-1 py-0.5">
                <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
                  {dict.trump}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-white/75 animate-pulse">
                  {trumpCallerName}...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtle Bot Sub Banner when a player is temporarily replaced after 15s offline */}
      {botSubbedPlayer ? (
        <div className="mx-auto mt-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-0.5 text-[10px] sm:text-xs font-semibold text-amber-200 text-center z-20">
          🤖 {dict.botTakeoverBanner(botSubbedPlayer.name)}
        </div>
      ) : null}

      {/* Middle Arena: Top Partner | Left Opponent + Center Table Mat + Right Opponent */}
      <div className="relative flex-1 flex flex-col items-center justify-center min-h-0 my-0.5">
        {/* Top Seat (Partner, rel 2) */}
        <div className="mb-1 sm:mb-2 z-20">{renderSeatBadge(2)}</div>

        <div className="w-full max-w-5xl flex items-center justify-between gap-1 sm:gap-4 px-0.5 sm:px-2">
          {/* Left Seat (rel 3) */}
          <div className="z-20 shrink-0">{renderSeatBadge(3)}</div>

          {/* Center Trick Mat */}
          <div className="relative min-w-0 flex-1 max-w-[235px] xs:max-w-[280px] sm:max-w-[440px] min-h-[135px] sm:min-h-[210px] rounded-[26px] sm:rounded-[48px] border border-amber-300/30 bg-black/25 shadow-[inset_0_0_36px_rgba(0,0,0,0.45)] flex items-center justify-center px-1.5 sm:px-2 py-1.5 sm:py-2">
            {/* Subtle Center Crest Watermark */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/omi-logo.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none w-20 h-20 sm:w-28 sm:h-28 object-contain opacity-[0.12] select-none"
            />

            {/* Played Cards in Current Trick */}
            <AnimatePresence>
              {game.phase !== "SELECT_TRUMP" &&
              game.phase !== "REVEAL_TRUMP_CARD"
                ? game.currentTrick.map((play) => {
                    const rel = relOfSeat(play.seat);
                    const pos = TRICK_CARD_OFFSET[rel];
                    const isWinningCard =
                      game.phase === "TRICK_COMPLETE" &&
                      game.lastTrickWinningCardId === play.card.id;

                    return (
                      <motion.div
                        key={play.card.id}
                        initial={{
                          opacity: 0,
                          x: pos.enterX,
                          y: pos.enterY,
                          scale: 0.72,
                        }}
                        animate={{
                          opacity: 1,
                          x: pos.x,
                          y: pos.y,
                          scale: isWinningCard ? 1.08 : 1,
                        }}
                        exit={{
                          opacity: 0,
                          x: trickWinnerExit.x,
                          y: trickWinnerExit.y,
                          scale: 0.45,
                          transition: { duration: animDuration * 0.85 },
                        }}
                        transition={{
                          type: "spring",
                          stiffness: fast ? 420 : 280,
                          damping: fast ? 28 : 24,
                        }}
                        className="absolute z-20"
                      >
                        <PlayingCard
                          card={play.card}
                          size="sm"
                          isTrump={play.card.suit === game.trumpSuit}
                          isWinning={isWinningCard}
                          isCut={Boolean(play.isCut)}
                        />
                      </motion.div>
                    );
                  })
                : null}
            </AnimatePresence>

            {/* Stage 1 Trump Picker Overlay (Suit from first 4 cards OR Blind 5th/6th/7th/8th Card) */}
            <AnimatePresence>
              {game.phase === "SELECT_TRUMP" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="relative z-30 w-full rounded-2xl sm:rounded-3xl border border-amber-400/50 bg-[#08120f]/95 backdrop-blur-md p-2.5 sm:p-4 text-center shadow-2xl"
                >
                  {isMyTrumpTurn ? (
                    <div className="space-y-2.5">
                      <div>
                        <h3 className="text-xs sm:text-base font-extrabold text-amber-200">
                          {dict.selectTrumpTitle}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-white/65 mt-0.5">
                          {dict.selectTrumpSubtitle}
                        </p>
                      </div>

                      {/* Option A: Choose Trump Suit from first 4 cards */}
                      <div className="grid grid-cols-2 min-[420px]:grid-cols-4 gap-1.5 sm:gap-2">
                        {SUITS.map((suit) => {
                          const red = isRedSuit(suit);
                          return (
                            <motion.button
                              key={suit}
                              type="button"
                              disabled={submitting}
                              whileHover={{ y: -3, scale: 1.04 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => handleSelectTrump(suit)}
                              className="min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-xl sm:rounded-2xl bg-white hover:bg-amber-50 py-1.5 sm:py-2 px-1 shadow-lg border-2 border-transparent hover:border-amber-400 transition disabled:opacity-50"
                            >
                              <SuitIcon
                                suit={suit}
                                className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                  red ? "text-[#c81e32]" : "text-[#171c28]"
                                }`}
                              />
                              <span
                                className={`text-[9px] sm:text-[11px] font-extrabold ${
                                  red ? "text-[#c81e32]" : "text-[#171c28]"
                                }`}
                              >
                                {dict.suits[suit]}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Option B: Blind pick 5th, 6th, 7th, or 8th card */}
                      <div className="pt-2 border-t border-white/15">
                        <p className="text-[10px] sm:text-[11px] font-semibold text-amber-200/85 mb-1.5">
                          {dict.orPickBlindCard}
                        </p>
                        <div className="grid grid-cols-2 min-[420px]:grid-cols-4 gap-1.5 sm:gap-3">
                          {BLIND_POSITIONS.map((pos) => (
                            <motion.button
                              key={pos}
                              type="button"
                              disabled={submitting}
                              whileHover={{ y: -5, scale: 1.06 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => handleSelectBlindTrump(pos)}
                              className="group min-h-11 min-w-0 flex flex-col items-center justify-center gap-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08120f] disabled:opacity-50"
                            >
                              <CardBack
                                design={prefs.cardBack}
                                size="xs"
                                className="sm:w-10 sm:h-14 ring-1 ring-amber-400/50 group-hover:ring-2 group-hover:ring-amber-300 transition"
                              />
                              <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-200 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                                {dict.blindCardLabel(pos)}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 px-2 space-y-1">
                      <Sparkles className="w-5 h-5 text-amber-300 mx-auto animate-pulse" />
                      <p className="text-xs sm:text-sm font-bold text-amber-100">
                        {dict.waitingForTrump(activePlayerName)}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-white/60">
                        {dict.waitingForCardsAfterTrump(activePlayerName)}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Blind Trump Card Reveal Overlay */}
            <AnimatePresence>
              {game.phase === "REVEAL_TRUMP_CARD" &&
              game.revealedTrumpCard &&
              game.revealedTrumpCardPosition ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative z-30 w-full rounded-2xl sm:rounded-3xl border border-amber-400/60 bg-[#08120f]/95 backdrop-blur-md p-3 sm:p-4 text-center shadow-2xl flex flex-col items-center gap-2"
                >
                  <p className="text-[11px] sm:text-xs font-bold text-amber-200/90">
                    {dict.dealerRevealedCard(
                      dealerName,
                      trumpCallerName,
                      game.revealedTrumpCardPosition
                    )}
                  </p>

                  <motion.div
                    initial={{ rotateY: 90, scale: 0.85 }}
                    animate={{ rotateY: 0, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <PlayingCard
                      card={game.revealedTrumpCard}
                      size="sm"
                      isTrump
                      isWinning
                    />
                  </motion.div>

                  <div>
                    <p className="text-xs sm:text-base font-black text-amber-300">
                      {SUIT_SYMBOL[game.revealedTrumpCard.suit]}{" "}
                      {dict.trumpIsNow(
                        dict.suits[game.revealedTrumpCard.suit]
                      )}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-white/60 animate-pulse">
                      {dict.dealingRemainingCards}
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Trick Complete / Cut Toast Banner */}
            <AnimatePresence>
              {game.phase === "TRICK_COMPLETE" && trickWinnerName ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-[11px] sm:text-xs font-black text-slate-950 shadow-xl flex items-center gap-1.5"
                >
                  {game.lastTrickCut ? (
                    <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-white">
                      ✂️ {dict.cutBanner}
                    </span>
                  ) : null}
                  <span>{dict.trickWinnerBanner(trickWinnerName)}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Right Seat (rel 1 — Next Anti-Clockwise!) */}
          <div className="z-20 shrink-0">{renderSeatBadge(1)}</div>
        </div>
      </div>

      {/* Bottom Area: Seat Badge + Turn Status + Player's Own Won Pile + Emotes + Fanned Hand */}
      <div className="relative z-20 shrink-0 mx-auto w-full max-w-4xl flex flex-col items-center">
        <div className="mb-1 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {renderSeatBadge(0)}

          {game.phase === "PLAYING" ? (
            <div
              className={`rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold border backdrop-blur-md ${
                isMyPlayTurn
                  ? "bg-amber-400/20 border-amber-400 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                  : "bg-black/40 border-white/15 text-white/75"
              }`}
            >
              {isMyPlayTurn ? dict.yourTurn : dict.playersTurn(activePlayerName)}
            </div>
          ) : null}

          {/* Player's Own Won Tricks Stack right next to their hand! */}
          <WonTricksPile
            tricks={myWonTricks}
            trumpSuit={game.trumpSuit}
            placement="bottom"
          />

          {/* Quick Emotes Button inside status row so it never overlaps cards on mobile */}
          {mySeat !== null ? (
            <div className="relative z-30">
              <AnimatePresence>
                {emoteOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.92 }}
                    className="absolute bottom-[calc(100%+0.5rem)] right-0 w-52 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-[#0c1412]/96 p-1.5 shadow-2xl grid grid-cols-1 gap-1"
                  >
                    {EMOTE_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleEmote(key)}
                        className="min-h-11 flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-white/90 hover:bg-amber-400/20 hover:text-amber-100 transition"
                      >
                        <span>{dict.emotes[key].emoji}</span>
                        <span>{dict.emotes[key].label}</span>
                      </button>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => {
                  setEmoteOpen((v) => !v);
                  soundEngine.playClick();
                }}
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full border border-amber-400/40 bg-black/60 hover:bg-amber-400/20 p-2 text-amber-200 shadow-lg backdrop-blur-md transition"
                aria-label="Emotes"
                title="Emotes"
              >
                <MessageSquareHeart className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Fanned Hand — Super Mobile Friendly, zero dimming/hints */}
        <div className="relative w-full flex items-end justify-center pt-1.5 pb-1 min-h-[84px] sm:min-h-[132px]">
          <div className="flex items-end justify-center -space-x-4 px-1 max-w-full">
            <AnimatePresence initial={false}>
              {myHand.map((card, index) => {
                const count = myHand.length;
                const mid = (count - 1) / 2;
                const offset = index - mid;
                const rotateDeg = offset * (count > 5 ? 2.1 : 3.0);
                const archY = Math.abs(offset) * (count > 5 ? 2.2 : 3.0);

                return (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 36, scale: 0.85 }}
                    animate={{
                      opacity: 1,
                      y: isMyPlayTurn ? archY - 3 : archY,
                      rotate: rotateDeg,
                      scale: 1,
                    }}
                    exit={{ opacity: 0, y: -36, scale: 0.8 }}
                    transition={{ duration: animDuration }}
                    style={{ zIndex: index + 1 }}
                    className="hover:!z-40 touch-manipulation"
                  >
                    <PlayingCard
                      card={card}
                      size="lg"
                      isTrump={card.suit === game.trumpSuit}
                      isInteractive={isMyPlayTurn && !submitting}
                      isLegal={true}
                      onClick={() => handlePlayCard(card.id)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Hand Summary & Match Victory Overlay — z-50 above TopBar, scrollable body + always-visible sticky CTA footer! */}
      <AnimatePresence>
        {(game.phase === "HAND_SUMMARY" || game.phase === "GAME_OVER") &&
        game.lastHandResult ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-md max-h-[90dvh] flex flex-col rounded-3xl border border-amber-400/35 bg-[#0a1411]/98 text-center text-white shadow-2xl overflow-hidden"
            >
              {/* Scrollable Content Body */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">
                {/* Header Icon */}
                <div
                  className={`mx-auto w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center ${
                    game.lastHandResult.outcomeType === "REVOKE"
                      ? "bg-rose-500/20 border-rose-400/60 text-rose-300"
                      : "bg-amber-400/15 border-amber-400/45 text-amber-300"
                  }`}
                >
                  {game.phase === "GAME_OVER" ? (
                    <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />
                  ) : game.lastHandResult.outcomeType === "REVOKE" ? (
                    <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
                  ) : game.lastHandResult.outcomeType === "KAPOTHI" ? (
                    <Crown className="w-6 h-6 sm:w-7 sm:h-7" />
                  ) : (
                    <Sparkles className="w-6 h-6" />
                  )}
                </div>

                {/* Outcome Headline */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300/80">
                    {game.phase === "GAME_OVER"
                      ? dict.matchComplete
                      : `${dict.hand} #${game.lastHandResult.handNumber} • ${dict.handComplete}`}
                  </p>

                  {game.phase === "GAME_OVER" && game.matchWinner ? (
                    <h2 className="mt-0.5 text-xl sm:text-2xl font-black text-amber-200">
                      {dict.winsMatch(
                        game.matchWinner === "A" ? dict.teamA : dict.teamB
                      )}
                    </h2>
                  ) : game.lastHandResult.outcomeType === "REVOKE" ? (
                    <h2 className="mt-0.5 text-lg sm:text-xl font-black text-rose-300">
                      {dict.revokeTitle}
                    </h2>
                  ) : game.lastHandResult.outcomeType === "SEPORU" ? (
                    <>
                      <h2 className="mt-0.5 text-xl font-black text-amber-200">
                        ⚖️ {dict.seporuTitle}
                      </h2>
                      <p className="mt-1 text-xs text-white/75">
                        {dict.seporuDesc}
                      </p>
                    </>
                  ) : (
                    <>
                      {game.lastHandResult.outcomeType === "KAPOTHI" ? (
                        <div className="mt-1 inline-block rounded-full bg-gradient-to-r from-amber-400 to-rose-400 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-slate-950">
                          🔥 {dict.sweepName(room.settings.kapothiLabel)}! (8–0)
                        </div>
                      ) : null}
                      <h2 className="mt-0.5 text-xl font-black text-white">
                        {dict.winsHand(
                          game.lastHandResult.winnerTeam === "A"
                            ? dict.teamA
                            : dict.teamB
                        )}
                      </h2>
                    </>
                  )}
                </div>

                {/* Revoke Visual Proof Box */}
                {revokeInfo ? (
                  <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 space-y-2">
                    <p className="text-xs font-semibold text-rose-100">
                      {dict.revokeSubtitle(
                        offendingPlayerName,
                        `${SUIT_SYMBOL[revokeInfo.ledSuit]} ${dict.suits[revokeInfo.ledSuit]}`
                      )}
                    </p>

                    <div className="flex items-center justify-center gap-6">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                          {dict.revokePlayedLabel}
                        </span>
                        <PlayingCard
                          card={revokeInfo.playedCard}
                          size="sm"
                          isTrump={
                            revokeInfo.playedCard.suit ===
                            game.lastHandResult.trumpSuit
                          }
                          isCut
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          {dict.revokeHadInHandLabel}
                        </span>
                        <PlayingCard
                          card={revokeInfo.heldMatchingCard}
                          size="sm"
                          isWinning
                        />
                      </div>
                    </div>

                    <p className="text-xs font-extrabold text-amber-200">
                      {dict.revokePenaltyNote(
                        revokeInfo.winningTeam === "A" ? dict.teamA : dict.teamB
                      )}
                    </p>
                  </div>
                ) : null}

                {/* Trick & Token Breakdown */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between text-white/75">
                    <span>{dict.tricks}</span>
                    <span className="font-bold text-white tabular-nums">
                      {dict.teamA} {game.lastHandResult.tricksWon.A} –{" "}
                      {game.lastHandResult.tricksWon.B} {dict.teamB}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/75">
                    <span>{dict.trump}</span>
                    <span className="font-bold text-amber-200">
                      {SUIT_SYMBOL[game.lastHandResult.trumpSuit]}{" "}
                      {dict.suits[game.lastHandResult.trumpSuit]} (
                      {game.lastHandResult.trumpTeam === "A"
                        ? dict.teamA
                        : dict.teamB}
                      )
                    </span>
                  </div>
                  {game.lastHandResult.totalTokensAwarded > 0 ? (
                    <>
                      <div className="flex justify-between text-white/75">
                        <span>{dict.baseTokensLabel}</span>
                        <span className="font-bold text-emerald-300">
                          +{game.lastHandResult.baseTokens}
                        </span>
                      </div>
                      {game.lastHandResult.bonusTokensApplied > 0 ? (
                        <div className="flex justify-between text-white/75">
                          <span>{dict.bonusTokensLabel}</span>
                          <span className="font-bold text-amber-300">
                            +{game.lastHandResult.bonusTokensApplied}
                          </span>
                        </div>
                      ) : null}
                      <div className="pt-1.5 border-t border-white/10 flex justify-between font-black text-amber-200">
                        <span>{dict.tokens}</span>
                        <span>
                          {dict.tokensAwarded(
                            game.lastHandResult.totalTokensAwarded
                          )}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Updated Keta Stack */}
                <KetaTokens
                  scores={game.scores}
                  carryOverBonus={game.carryOverBonus}
                  myTeam={myTeam}
                  compact
                />
              </div>

              {/* Sticky Footer Action Buttons — ALWAYS reachable without scrolling! */}
              <div className="shrink-0 border-t border-white/10 bg-[#08100d] p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:p-4">
                {isHost ? (
                  game.phase === "GAME_OVER" ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            returnRoomToLobby(room.code);
                          }}
                          className="min-h-11 rounded-xl border border-white/15 bg-white/[0.07] hover:bg-white/15 py-2.5 text-xs sm:text-sm font-bold text-white transition"
                        >
                          {dict.backToLobby}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playCardDeal();
                            startMatch(room.code);
                          }}
                          className="min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 py-2.5 text-xs sm:text-sm font-black text-slate-950 transition"
                        >
                          <RotateCcw className="w-4 h-4" />
                          {dict.playAgain}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleCloseFinishedRoom}
                        className="min-h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/35 bg-rose-500/15 hover:bg-rose-500/25 py-2 text-xs font-bold text-rose-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {dict.closeRoom}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playCardDeal();
                        dealNextHand(room.code);
                      }}
                      className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-110 py-3 text-sm sm:text-base font-black text-slate-950 shadow-xl shadow-amber-500/20 transition"
                    >
                      {dict.nextHand}
                    </button>
                  )
                ) : (
                  <p className="text-xs text-amber-200/80 animate-pulse py-1">
                    {dict.waitingForHost}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
