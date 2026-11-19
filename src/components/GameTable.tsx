"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Crown,
  MessageSquareHeart,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { isRedSuit, SUIT_SYMBOL } from "@/lib/i18n";
import { getLegalCards, getTeam, SUITS } from "@/lib/omiEngine";
import {
  dealNextHand,
  returnRoomToLobby,
  sendTableEmote,
  startMatch,
  submitCardPlay,
  submitTrumpChoice,
} from "@/lib/roomService";
import { useSettings } from "@/lib/settings";
import { soundEngine } from "@/lib/sound";
import type {
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

// Position of each played card inside the center mat based on relative seat
// rel 0 = Bottom, rel 1 = Right (CCW next), rel 2 = Top (Partner), rel 3 = Left
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
      game.phase === "PLAYING" &&
      prevPhaseRef.current === "SELECT_TRUMP"
    ) {
      soundEngine.playTrumpCall();
      setTimeout(() => soundEngine.playCardDeal(), 240);
    } else if (game.currentTrick.length > prevTrickLenRef.current) {
      const latestPlay = game.currentTrick[game.currentTrick.length - 1];
      soundEngine.playCardSlap(Boolean(latestPlay?.isCut));
    } else if (
      game.phase === "PLAYING" &&
      prevPhaseRef.current === "TRICK_COMPLETE"
    ) {
      // Trick collected
      const winnerTeam = getTeam(game.trickLeader);
      soundEngine.playTrickWin(myTeam === null ? true : winnerTeam === myTeam);
    } else if (
      (game.phase === "HAND_SUMMARY" || game.phase === "GAME_OVER") &&
      prevPhaseRef.current !== game.phase
    ) {
      const res = game.lastHandResult;
      if (res?.outcomeType === "KAPOTHI" || game.phase === "GAME_OVER") {
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

  const legalCardIds = useMemo(() => {
    if (!isMyPlayTurn) return new Set<string>();
    const legal = getLegalCards(myHand, game.currentTrick);
    return new Set(legal.map((c) => c.id));
  }, [isMyPlayTurn, myHand, game.currentTrick]);

  const ledSuit =
    game.currentTrick.length > 0 ? game.currentTrick[0].card.suit : null;
  const hasLedSuit =
    ledSuit !== null && myHand.some((c) => c.suit === ledSuit);

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

  const handlePlayCard = async (cardId: string) => {
    if (!isMyPlayTurn || submitting || mySeat === null) return;
    if (!legalCardIds.has(cardId)) return;
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

  return (
    <div className="relative z-10 flex-1 flex flex-col justify-between overflow-hidden px-2 sm:px-5 pt-2 pb-3 select-none">
      {/* Top HUD Row: Keta Tokens | Live Trick Counter | Floating Trump Badge */}
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

        {/* Center/Right: Trick Counter + Trump Suit Badge */}
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

          {/* Floating Trump Suit Badge */}
          <div className="glass-panel rounded-2xl border border-amber-400/40 bg-amber-400/[0.08] px-3 py-2 flex items-center gap-2 shadow-lg">
            {game.trumpSuit ? (
              <>
                <span
                  className={`w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow ${
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
              <div className="leading-tight px-1">
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
          <div className="relative flex-1 max-w-[340px] sm:max-w-[420px] h-[185px] sm:h-[225px] rounded-[48px] border border-amber-300/25 bg-black/20 shadow-[inset_0_0_40px_rgba(0,0,0,0.45)] flex items-center justify-center">
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
              {game.currentTrick.map((play) => {
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
              })}
            </AnimatePresence>

            {/* Stage 1 Trump Picker Overlay (inside center mat so bottom 4 cards stay visible!) */}
            <AnimatePresence>
              {game.phase === "SELECT_TRUMP" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="relative z-30 w-[94%] rounded-3xl border border-amber-400/50 bg-[#08120f]/92 backdrop-blur-md p-3.5 sm:p-4 text-center shadow-2xl"
                >
                  {isMyTrumpTurn ? (
                    <>
                      <h3 className="text-sm sm:text-base font-extrabold text-amber-200">
                        {dict.selectTrumpTitle}
                      </h3>
                      <p className="text-[11px] text-white/65 mt-0.5 mb-3">
                        {dict.selectTrumpSubtitle}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
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
                              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white hover:bg-amber-50 py-2.5 px-1.5 shadow-lg border-2 border-transparent hover:border-amber-400 transition"
                            >
                              <SuitIcon
                                suit={suit}
                                className={`w-6 h-6 sm:w-7 sm:h-7 ${
                                  red ? "text-[#c81e32]" : "text-[#171c28]"
                                }`}
                              />
                              <span
                                className={`text-[10px] sm:text-xs font-extrabold ${
                                  red ? "text-[#c81e32]" : "text-[#171c28]"
                                }`}
                              >
                                {dict.suits[suit]}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="py-3">
                      <Sparkles className="w-6 h-6 text-amber-300 mx-auto mb-1.5 animate-pulse" />
                      <p className="text-xs sm:text-sm font-bold text-amber-100">
                        {dict.waitingForTrump(activePlayerName)}
                      </p>
                    </div>
                  )}
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

          {/* Right Seat (rel 1 — Next Counter-Clockwise!) */}
          <div className="z-20 shrink-0">{renderSeatBadge(1)}</div>
        </div>
      </div>

      {/* Bottom Area: Turn Guidance + Player Seat Badge + Fanned Hand + Emotes */}
      <div className="relative z-20 mx-auto w-full max-w-4xl flex flex-col items-center">
        {/* Status & Turn Hint Bar */}
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
              {isMyPlayTurn ? (
                <span>
                  {dict.yourTurn}
                  {ledSuit ? (
                    <span className="ml-1.5 text-white/90">
                      •{" "}
                      {hasLedSuit
                        ? dict.mustFollowSuit(
                            `${SUIT_SYMBOL[ledSuit]} ${dict.suits[ledSuit]}`
                          )
                        : dict.canCutOrDiscard}
                    </span>
                  ) : null}
                </span>
              ) : (
                dict.playersTurn(activePlayerName)
              )}
            </div>
          ) : null}
        </div>

        {/* Fanned Hand */}
        <div className="relative w-full flex items-end justify-center pt-3 pb-1 min-h-[118px] sm:min-h-[144px]">
          <div className="flex items-end justify-center -space-x-5 sm:-space-x-4 md:-space-x-3 px-2 max-w-full">
            <AnimatePresence initial={false}>
              {myHand.map((card, index) => {
                const count = myHand.length;
                const mid = (count - 1) / 2;
                const offset = index - mid;
                const rotateDeg = offset * (count > 5 ? 2.8 : 3.5);
                const archY = Math.abs(offset) * (count > 5 ? 3.5 : 4);
                const isLegal = isMyPlayTurn && legalCardIds.has(card.id);

                return (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 40, scale: 0.85 }}
                    animate={{
                      opacity: 1,
                      y: isMyPlayTurn && isLegal ? archY - 6 : archY,
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
                      isLegal={isMyPlayTurn ? isLegal : true}
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

      {/* Hand Summary & Match Victory Overlay */}
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
              className="w-full max-w-md rounded-3xl border border-amber-400/35 bg-[#0a1411]/95 p-6 text-center text-white shadow-2xl space-y-4"
            >
              {/* Header Icon */}
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/45 flex items-center justify-center text-amber-300">
                {game.phase === "GAME_OVER" ? (
                  <Trophy className="w-8 h-8" />
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
