"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Crown,
  MessageSquareHeart,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
} from "lucide-react";
import { isRedSuit, SUIT_SYMBOL } from "@/lib/i18n";
import { getTeam, SUITS } from "@/lib/omiEngine";
import {
  dealNextHand,
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

interface GameTableProps {
  room: RoomData;
  game: GameState;
  uid: string;
  mySeat: SeatIndex | null;
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

// Position of each played card inside the center mat based on relative seat
// rel 0 = Bottom, rel 1 = Right (anti-clockwise next), rel 2 = Top (Partner), rel 3 = Left
const TRICK_CARD_OFFSET: Record<
  number,
  { x: number; y: number; enterX: number; enterY: number }
> = {
  0: { x: 0, y: 42, enterX: 0, enterY: 130 },
  1: { x: 64, y: 0, enterX: 150, enterY: 0 },
  2: { x: 0, y: -42, enterX: 0, enterY: -130 },
  3: { x: -64, y: 0, enterX: -150, enterY: 0 },
};

export function GameTable({ room, game, uid, mySeat }: GameTableProps) {
  const { prefs, dict } = useSettings();
  const [submittingSeq, setSubmittingSeq] = useState<number | null>(null);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const submitting = submittingSeq === game.actionSeq;
  const isHost = room.hostUid === uid;
  const baseSeat: SeatIndex = mySeat ?? 0;
  const myTeam = mySeat !== null ? getTeam(mySeat) : null;
  const fast = prefs.animationSpeed === "fast";
  const animDuration = fast ? 0.18 : 0.34;

  // Map visual positions (Bottom=0, Right=1, Top=2, Left=3) -> actual seat index
  const seatAtRel = (rel: 0 | 1 | 2 | 3): SeatIndex =>
    ((baseSeat + rel) % 4) as SeatIndex;

  const relOfSeat = (seat: SeatIndex): 0 | 1 | 2 | 3 =>
    (((seat - baseSeat + 4) % 4) as 0 | 1 | 2 | 3);

  // Tick clock for countdown timer and expiring emote bubbles
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 300);
    return () => window.clearInterval(id);
  }, []);

  // Sound effect triggers driven by actionSeq transitions
  const prevSeqRef = useRef<number>(game.actionSeq);
  const prevPhaseRef = useRef<GameState["phase"]>(game.phase);
  const prevTrickLenRef = useRef<number>(game.currentTrick.length);

  useEffect(() => {
    if (game.actionSeq === prevSeqRef.current) return;

    if (
      game.phase === "SELECT_TRUMP" &&
      prevPhaseRef.current !== "SELECT_TRUMP"
    ) {
      soundEngine.playCardDeal();
    } else if (
      game.phase === "REVEAL_TRUMP_CARD" &&
      prevPhaseRef.current !== "REVEAL_TRUMP_CARD"
    ) {
      soundEngine.playTrumpCall();
    } else if (
      game.phase === "PLAYING" &&
      (prevPhaseRef.current === "SELECT_TRUMP" ||
        prevPhaseRef.current === "REVEAL_TRUMP_CARD")
    ) {
      if (prevPhaseRef.current === "SELECT_TRUMP") {
        soundEngine.playTrumpCall();
      }
      setTimeout(() => soundEngine.playCardDeal(), 200);
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
        soundEngine.playSeporu();
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

    prevSeqRef.current = game.actionSeq;
    prevPhaseRef.current = game.phase;
    prevTrickLenRef.current = game.currentTrick.length;
  }, [game, myTeam]);

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
      await submitBlindTrumpCard(room.code, mySeat, position);
    } catch {
      setSubmittingSeq(null);
    }
  };

  // All cards in hand are playable with NO forced site suggestions/blocking.
  // Failing to follow suit while holding the led suit triggers a Revoke loss in the engine!
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

  // Active emotes (< 4.5s old)
  const getActiveEmote = (seat: SeatIndex) => {
    const ev = room.emotes?.[String(seat)];
    if (!ev) return null;
    if (nowTs - ev.timestamp > 4500) return null;
    return ev;
  };

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
    const emote = getActiveEmote(seat);
    const isPartner = mySeat !== null && rel === 2;

    return (
      <div className="relative flex flex-col items-center gap-1.5">
        {/* Floating Emote Bubble */}
        <AnimatePresence>
          {emote ? (
            <motion.div
              key={emote.id}
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.85 }}
              className="absolute -top-11 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-full bg-amber-300 px-3 py-1 text-xs font-extrabold text-slate-950 shadow-xl"
            >
              {dict.emotes[emote.emoteKey].emoji}{" "}
              {dict.emotes[emote.emoteKey].label}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Opponent / Partner Mini Card Backs */}
        {rel !== 0 ? (
          <div className="flex items-center justify-center -space-x-4 sm:-space-x-3.5 h-10 sm:h-11">
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

        {/* Player Pill */}
        <div
          className={`relative flex items-center gap-2 rounded-2xl px-2.5 sm:px-3.5 py-1.5 border backdrop-blur-md transition-all ${
            isTurn
              ? "bg-amber-400/20 border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.45)] scale-[1.03]"
              : "bg-black/45 border-white/15"
          }`}
        >
          {/* Team indicator dot */}
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              team === "A"
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                : "bg-slate-200 ring-1 ring-slate-500"
            }`}
          />

          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[84px] sm:max-w-[120px]">
                {player.name}
              </span>
              {player.isBot ? (
                <Bot className="w-3 h-3 text-amber-300 shrink-0" />
              ) : (
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    player.online ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/60">
              <span>{team === "A" ? dict.teamA : dict.teamB}</span>
              {isPartner ? (
                <span className="text-emerald-300 font-semibold">
                  • {dict.partnerBadge}
                </span>
              ) : null}
              {isDealer ? (
                <span
                  title={dict.dealer}
                  className="ml-0.5 rounded bg-white/15 px-1 font-bold text-white/90"
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
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
                remainingSeconds <= 5
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-amber-400 text-slate-950"
              }`}
            >
              {remainingSeconds}s
            </span>
          ) : null}
        </div>
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

  return (
    <div className="relative z-10 flex-1 flex flex-col justify-between overflow-hidden px-2 sm:px-5 pt-2 pb-3 select-none">
      {/* Top HUD Row: Keta Tokens | Live Trick Counter | Selected Trump Card/Suit Badge */}
      <div className="mx-auto w-full max-w-6xl flex flex-wrap items-start justify-between gap-2 z-20">
        {/* Left: Keta Token Stack */}
        <div className="w-full sm:w-auto sm:min-w-[270px]">
          <KetaTokens
            scores={game.scores}
            carryOverBonus={game.carryOverBonus}
            myTeam={myTeam}
            compact
          />
        </div>

        {/* Center/Right: Trick Counter + Selected Trump Card Display */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Live Trick Counter */}
          <div className="glass-panel rounded-2xl border border-white/15 px-3 py-2 text-center shadow-lg">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/55">
              {dict.hand} #{game.handNumber} • {dict.tricks} {game.trickNumber}/8
            </div>
            <div className="mt-0.5 flex items-center justify-center gap-2.5 text-sm font-black tabular-nums">
              <span className="text-rose-300">
                {dict.teamA}: {game.tricksWon.A}
              </span>
              <span className="text-white/30">–</span>
              <span className="text-slate-200">
                {dict.teamB}: {game.tricksWon.B}
              </span>
            </div>
          </div>

          {/* Top-of-Game Selected Trump Card / Suit Badge */}
          <div className="glass-panel rounded-2xl border border-amber-400/50 bg-amber-400/[0.1] px-3 py-1.5 flex items-center gap-2.5 shadow-lg">
            {game.revealedTrumpCard ? (
              <>
                <PlayingCard
                  card={game.revealedTrumpCard}
                  size="xs"
                  isTrump
                  className="shrink-0"
                />
                <div className="leading-tight">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/85">
                    <span>{dict.trump}</span>
                    {game.revealedTrumpCardPosition ? (
                      <span className="rounded bg-amber-400/25 px-1 text-[9px] font-extrabold text-amber-200">
                        {dict.blindCardLabel(game.revealedTrumpCardPosition)}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-white">
                    {game.revealedTrumpCard.rank}{" "}
                    {SUIT_SYMBOL[game.revealedTrumpCard.suit]}{" "}
                    {dict.suits[game.revealedTrumpCard.suit]}
                  </div>
                </div>
              </>
            ) : game.trumpSuit ? (
              <>
                <span
                  className={`w-9 h-12 rounded-lg bg-gradient-to-br from-white to-[#efeae0] border border-amber-400/70 flex flex-col items-center justify-center shadow ${
                    isRedSuit(game.trumpSuit)
                      ? "text-[#c81e32]"
                      : "text-[#171c28]"
                  }`}
                >
                  <SuitIcon suit={game.trumpSuit} className="w-5 h-5" />
                </span>
                <div className="leading-tight">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
                    {dict.trump}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-white">
                    {dict.suits[game.trumpSuit]}
                  </div>
                </div>
              </>
            ) : (
              <div className="leading-tight px-1 py-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
                  {dict.trump}
                </div>
                <div className="text-xs font-bold text-white/75 animate-pulse">
                  {trumpCallerName}...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Arena: Top Partner | Left Opponent + Center Table Mat + Right Opponent */}
      <div className="relative flex-1 flex flex-col items-center justify-center my-1 min-h-[260px] sm:min-h-[330px]">
        {/* Top Seat (Partner, rel 2) */}
        <div className="mb-2 sm:mb-3 z-20">{renderSeatBadge(2)}</div>

        <div className="w-full max-w-5xl flex items-center justify-between gap-2 sm:gap-4 px-1">
          {/* Left Seat (rel 3) */}
          <div className="z-20 shrink-0">{renderSeatBadge(3)}</div>

          {/* Center Trick Mat */}
          <div className="relative flex-1 max-w-[360px] sm:max-w-[460px] min-h-[195px] sm:min-h-[235px] rounded-[48px] border border-amber-300/25 bg-black/20 shadow-[inset_0_0_40px_rgba(0,0,0,0.45)] flex items-center justify-center px-2 py-2">
            {/* Subtle Center Crest Watermark */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/omi-logo.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none w-24 h-24 sm:w-32 sm:h-32 object-contain opacity-[0.12] select-none"
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
                          scale: 0.55,
                          transition: { duration: animDuration * 0.7 },
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
                  className="relative z-30 w-full rounded-3xl border border-amber-400/50 bg-[#08120f]/94 backdrop-blur-md p-3 sm:p-4 text-center shadow-2xl"
                >
                  {isMyTrumpTurn ? (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-amber-200">
                          {dict.selectTrumpTitle}
                        </h3>
                        <p className="text-[11px] text-white/65 mt-0.5">
                          {dict.selectTrumpSubtitle}
                        </p>
                      </div>

                      {/* Option A: Choose Trump Suit from first 4 cards */}
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {SUITS.map((suit) => {
                          const red = isRedSuit(suit);
                          return (
                            <motion.button
                              key={suit}
                              type="button"
                              disabled={submitting}
                              whileHover={{ y: -3, scale: 1.04 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleSelectTrump(suit)}
                              className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-white hover:bg-amber-50 py-2 px-1 shadow-lg border-2 border-transparent hover:border-amber-400 transition"
                            >
                              <SuitIcon
                                suit={suit}
                                className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                  red ? "text-[#c81e32]" : "text-[#171c28]"
                                }`}
                              />
                              <span
                                className={`text-[10px] sm:text-[11px] font-extrabold ${
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
                      <div className="pt-2.5 border-t border-white/15">
                        <p className="text-[11px] font-semibold text-amber-200/85 mb-2">
                          {dict.orPickBlindCard}
                        </p>
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          {BLIND_POSITIONS.map((pos) => (
                            <motion.button
                              key={pos}
                              type="button"
                              disabled={submitting}
                              whileHover={{ y: -5, scale: 1.06 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => handleSelectBlindTrump(pos)}
                              className="group flex flex-col items-center gap-1 focus:outline-none"
                            >
                              <CardBack
                                design={prefs.cardBack}
                                size="sm"
                                className="ring-1 ring-amber-400/50 group-hover:ring-2 group-hover:ring-amber-300 group-hover:shadow-[0_0_18px_rgba(251,191,36,0.5)] transition"
                              />
                              <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-black text-amber-200 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                                {dict.blindCardLabel(pos)}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 px-2 space-y-1.5">
                      <Sparkles className="w-6 h-6 text-amber-300 mx-auto animate-pulse" />
                      <p className="text-xs sm:text-sm font-bold text-amber-100">
                        {dict.waitingForTrump(activePlayerName)}
                      </p>
                      <p className="text-[11px] text-white/60">
                        {dict.waitingForCardsAfterTrump(activePlayerName)}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Blind Trump Card Reveal Overlay (Visible to ALL players!) */}
            <AnimatePresence>
              {game.phase === "REVEAL_TRUMP_CARD" &&
              game.revealedTrumpCard &&
              game.revealedTrumpCardPosition ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative z-30 w-full rounded-3xl border border-amber-400/60 bg-[#08120f]/95 backdrop-blur-md p-4 text-center shadow-2xl flex flex-col items-center gap-2.5"
                >
                  <p className="text-xs font-bold text-amber-200/90">
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
                      size="md"
                      isTrump
                      isWinning
                    />
                  </motion.div>

                  <div>
                    <p className="text-sm sm:text-base font-black text-amber-300">
                      {SUIT_SYMBOL[game.revealedTrumpCard.suit]}{" "}
                      {dict.trumpIsNow(
                        dict.suits[game.revealedTrumpCard.suit]
                      )}
                    </p>
                    <p className="text-[11px] text-white/60 mt-0.5 animate-pulse">
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
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-full bg-amber-400 px-3.5 py-1 text-xs font-black text-slate-950 shadow-xl flex items-center gap-1.5"
                >
                  {game.lastTrickCut ? (
                    <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] text-white">
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

      {/* Bottom Area: Turn Status + Player Seat Badge + Fanned Hand (NO card dimming/suggestions!) + Emotes */}
      <div className="relative z-20 mx-auto w-full max-w-4xl flex flex-col items-center">
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
          {renderSeatBadge(0)}

          {game.phase === "PLAYING" ? (
            <div
              className={`rounded-full px-3.5 py-1 text-xs font-bold border backdrop-blur-md ${
                isMyPlayTurn
                  ? "bg-amber-400/20 border-amber-400 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                  : "bg-black/40 border-white/15 text-white/75"
              }`}
            >
              {isMyPlayTurn ? dict.yourTurn : dict.playersTurn(activePlayerName)}
            </div>
          ) : null}
        </div>

        {/* Fanned Hand — all cards stay fully visible and clickable on your turn! */}
        <div className="relative w-full flex items-end justify-center pt-3 pb-1 min-h-[118px] sm:min-h-[144px]">
          <div className="flex items-end justify-center -space-x-5 sm:-space-x-4 md:-space-x-3 px-2 max-w-full">
            <AnimatePresence initial={false}>
              {myHand.map((card, index) => {
                const count = myHand.length;
                const mid = (count - 1) / 2;
                const offset = index - mid;
                const rotateDeg = offset * (count > 5 ? 2.8 : 3.5);
                const archY = Math.abs(offset) * (count > 5 ? 3.5 : 4);

                return (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 40, scale: 0.85 }}
                    animate={{
                      opacity: 1,
                      y: isMyPlayTurn ? archY - 4 : archY,
                      rotate: rotateDeg,
                      scale: 1,
                    }}
                    exit={{ opacity: 0, y: -40, scale: 0.8 }}
                    transition={{ duration: animDuration }}
                    style={{ zIndex: index + 1 }}
                    className="hover:!z-40"
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

          {/* Floating Quick Emotes Button */}
          {mySeat !== null ? (
            <div className="absolute right-1 sm:right-2 bottom-2 z-30">
              <AnimatePresence>
                {emoteOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.92 }}
                    className="absolute bottom-12 right-0 w-52 rounded-2xl border border-white/15 bg-[#0c1412]/95 p-2 shadow-2xl grid grid-cols-1 gap-1"
                  >
                    {EMOTE_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleEmote(key)}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-white/90 hover:bg-amber-400/20 hover:text-amber-200 transition"
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
                className="rounded-full border border-amber-400/40 bg-black/60 hover:bg-amber-400/20 p-2.5 text-amber-300 shadow-lg backdrop-blur-md transition"
                aria-label="Emotes"
                title="Emotes"
              >
                <MessageSquareHeart className="w-5 h-5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Hand Summary & Match Victory Overlay (including Revoke Violation proof!) */}
      <AnimatePresence>
        {(game.phase === "HAND_SUMMARY" || game.phase === "GAME_OVER") &&
        game.lastHandResult ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-amber-400/35 bg-[#0a1411]/95 p-6 text-center text-white shadow-2xl space-y-4"
            >
              {/* Header Icon */}
              <div
                className={`mx-auto w-14 h-14 rounded-2xl border flex items-center justify-center ${
                  game.lastHandResult.outcomeType === "REVOKE"
                    ? "bg-rose-500/20 border-rose-400/60 text-rose-300"
                    : "bg-amber-400/15 border-amber-400/45 text-amber-300"
                }`}
              >
                {game.phase === "GAME_OVER" ? (
                  <Trophy className="w-8 h-8" />
                ) : game.lastHandResult.outcomeType === "REVOKE" ? (
                  <ShieldAlert className="w-8 h-8" />
                ) : game.lastHandResult.outcomeType === "KAPOTHI" ? (
                  <Crown className="w-8 h-8" />
                ) : (
                  <Sparkles className="w-7 h-7" />
                )}
              </div>

              {/* Outcome Headline */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-300/80">
                  {game.phase === "GAME_OVER"
                    ? dict.matchComplete
                    : `${dict.hand} #${game.lastHandResult.handNumber} • ${dict.handComplete}`}
                </p>

                {game.phase === "GAME_OVER" && game.matchWinner ? (
                  <h2 className="mt-1 text-2xl sm:text-3xl font-black text-amber-200">
                    {dict.winsMatch(
                      game.matchWinner === "A" ? dict.teamA : dict.teamB
                    )}
                  </h2>
                ) : game.lastHandResult.outcomeType === "REVOKE" ? (
                  <h2 className="mt-1 text-xl sm:text-2xl font-black text-rose-300">
                    {dict.revokeTitle}
                  </h2>
                ) : game.lastHandResult.outcomeType === "SEPORU" ? (
                  <>
                    <h2 className="mt-1 text-2xl font-black text-amber-200">
                      ⚖️ {dict.seporuTitle}
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-white/75">
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
                    <h2 className="mt-1 text-2xl font-black text-white">
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
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 space-y-3">
                  <p className="text-xs sm:text-sm font-semibold text-rose-100">
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
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-2.5 text-sm">
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
                    <div className="pt-2 border-t border-white/10 flex justify-between font-black text-amber-200">
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
              />

              {/* Action Buttons */}
              {isHost ? (
                game.phase === "GAME_OVER" ? (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        returnRoomToLobby(room.code);
                      }}
                      className="rounded-xl border border-white/15 bg-white/[0.07] hover:bg-white/15 py-3 text-xs sm:text-sm font-bold text-white transition"
                    >
                      {dict.backToLobby}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playCardDeal();
                        startMatch(room.code);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 py-3 text-xs sm:text-sm font-black text-slate-950 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {dict.playAgain}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playCardDeal();
                      dealNextHand(room.code);
                    }}
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-110 py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xl shadow-amber-500/20 transition"
                  >
                    {dict.nextHand}
                  </button>
                )
              ) : (
                <p className="text-xs text-amber-200/80 animate-pulse pt-1">
                  {dict.waitingForHost}
                </p>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
