"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Check,
  Copy,
  Crown,
  Link2,
  Play,
  Share2,
  Timer,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  addBotToSeat,
  deleteRoom,
  fillEmptySeatsWithBots,
  removeBotFromSeat,
  startMatch,
  switchSeat,
  updateRoomSettings,
} from "@/lib/roomService";
import { useSettings } from "@/lib/settings";
import { soundEngine } from "@/lib/sound";
import type {
  KapothiLabel,
  RoomData,
  SeatIndex,
  TurnTimerOption,
} from "@/lib/types";

interface LobbyViewProps {
  room: RoomData;
  uid: string;
  deviceId: string;
  mySeat: SeatIndex | null;
  nickname: string;
  onRoomClosed: () => void;
}

export function LobbyView({
  room,
  uid,
  deviceId,
  mySeat,
  nickname,
  onRoomClosed,
}: LobbyViewProps) {
  const { prefs, dict } = useSettings();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busySeat, setBusySeat] = useState<SeatIndex | null>(null);

  const isHost = room.hostUid === uid;
  const filledCount = ([0, 1, 2, 3] as SeatIndex[]).filter(
    (s) => room.seats[String(s)] !== null
  ).length;
  const allFilled = filledCount === 4;

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${room.code}`
      : `/room/${room.code}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      soundEngine.playClick();
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // fallback
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      soundEngine.playClick();
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleWhatsAppShare = () => {
    soundEngine.playClick();
    const msg = dict.whatsAppMessage(room.code, inviteUrl);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleSeatClick = async (seat: SeatIndex) => {
    if (room.seats[String(seat)] !== null || busySeat !== null) return;
    setBusySeat(seat);
    try {
      soundEngine.playClick();
      await switchSeat(room.code, uid, nickname, seat, deviceId);
    } finally {
      setBusySeat(null);
    }
  };

  const handleDisband = async () => {
    if (!isHost) return;
    soundEngine.playClick();
    await deleteRoom(room.code).catch(() => {});
    onRoomClosed();
  };

  const handleAddBot = async (e: React.MouseEvent, seat: SeatIndex) => {
    e.stopPropagation();
    if (!isHost || busySeat !== null) return;
    setBusySeat(seat);
    try {
      soundEngine.playClick();
      await addBotToSeat(room.code, seat);
    } finally {
      setBusySeat(null);
    }
  };

  const handleRemoveBot = async (e: React.MouseEvent, seat: SeatIndex) => {
    e.stopPropagation();
    if (!isHost || busySeat !== null) return;
    setBusySeat(seat);
    try {
      soundEngine.playClick();
      await removeBotFromSeat(room.code, seat);
    } finally {
      setBusySeat(null);
    }
  };

  const handleStart = async () => {
    if (!isHost || !allFilled || starting) return;
    setStarting(true);
    try {
      soundEngine.playCardDeal();
      await startMatch(room.code);
    } finally {
      setStarting(false);
    }
  };

  const renderSeatCard = (seat: SeatIndex) => {
    const player = room.seats[String(seat)];
    const team = seat === 0 || seat === 2 ? "A" : "B";
    const isMe = player?.uid === uid;
    const isSeatHost = player?.uid === room.hostUid;
    const teamColor =
      team === "A"
        ? "border-rose-400/40 bg-rose-500/[0.08]"
        : "border-sky-300/35 bg-slate-900/60";
    const teamPill =
      team === "A"
        ? "bg-rose-500/20 text-rose-200 border-rose-400/40"
        : "bg-slate-700/70 text-slate-200 border-slate-400/40";

    if (!player) {
      return (
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => handleSeatClick(seat)}
          className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 bg-black/25 hover:bg-white/[0.07] hover:border-amber-400/60 p-4 min-h-[126px] cursor-pointer transition text-center"
        >
          <span
            className={`absolute top-2.5 left-2.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${teamPill}`}
          >
            {team === "A" ? dict.teamA : dict.teamB}
          </span>
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/50 group-hover:text-amber-300 group-hover:border-amber-400/50 transition">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white/75">{dict.emptySeat}</p>
            <p className="text-[11px] text-white/45">{dict.clickToSit}</p>
          </div>
          {isHost ? (
            <button
              type="button"
              onClick={(e) => handleAddBot(e, seat)}
              disabled={busySeat === seat}
              className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 px-2.5 py-1 text-[11px] font-bold text-amber-200 transition"
            >
              <Bot className="w-3 h-3" />
              {dict.addBot}
            </button>
          ) : null}
        </motion.div>
      );
    }

    return (
      <div
        className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 min-h-[126px] text-center shadow-lg transition ${teamColor} ${
          isMe ? "ring-2 ring-amber-400/80" : ""
        }`}
      >
        <span
          className={`absolute top-2.5 left-2.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${teamPill}`}
        >
          {team === "A" ? dict.teamA : dict.teamB}
        </span>

        {/* Online / Bot status */}
        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-semibold text-white/70">
          {player.isBot ? (
            <Bot className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <span
              className={`w-2 h-2 rounded-full ${
                player.online
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                  : "bg-rose-400"
              }`}
            />
          )}
        </span>

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300/25 to-amber-600/25 border border-amber-300/40 flex items-center justify-center text-base font-extrabold text-amber-200">
          {player.isBot ? (
            <Bot className="w-5 h-5" />
          ) : (
            player.name.slice(0, 1).toUpperCase()
          )}
        </div>

        <div className="max-w-full">
          <p className="text-sm font-bold text-white truncate max-w-[140px]">
            {player.name}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
            {isMe ? (
              <span className="rounded-full bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                {dict.youBadge}
              </span>
            ) : null}
            {isSeatHost ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                <Crown className="w-2.5 h-2.5" />
                {dict.hostBadge}
              </span>
            ) : null}
            {player.isBot ? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/75">
                {dict.botBadge}
              </span>
            ) : null}
          </div>
        </div>

        {isHost && player.isBot ? (
          <button
            type="button"
            onClick={(e) => handleRemoveBot(e, seat)}
            className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-500/15 hover:bg-rose-500/30 border border-rose-400/35 px-2 py-0.5 text-[10px] font-semibold text-rose-200 transition"
          >
            <X className="w-3 h-3" />
            {dict.removeBot}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="relative z-10 flex-1 overflow-y-auto px-3 sm:px-6 py-5">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Invite Banner */}
        <div className="glass-panel rounded-3xl border border-white/15 p-4 sm:p-5 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="rounded-2xl bg-amber-400/15 border border-amber-400/40 px-4 py-2.5 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/75">
                  {dict.roomCode}
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black tracking-[0.2em] text-amber-300">
                  {room.code}
                </div>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-white">
                  {dict.roomLobby}
                </h1>
                <p className="text-xs sm:text-sm text-white/65 flex items-center gap-1.5 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-amber-300" />
                  <span>{filledCount} / 4</span>
                  <span className="text-white/35">•</span>
                  <span>
                    {dict.teamA} ({dict.redTokens}) vs {dict.teamB} (
                    {dict.blackTokens})
                  </span>
                </p>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                {copiedLink ? dict.linkCopied : dict.copyInviteLink}
              </button>

              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/15 px-3 py-2.5 text-xs sm:text-sm font-semibold text-white transition"
              >
                {copiedCode ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-amber-300" />
                )}
                {copiedCode ? dict.codeCopied : dict.copyCode}
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-2.5 text-xs sm:text-sm font-bold text-emerald-200 transition"
              >
                <Share2 className="w-4 h-4" />
                {dict.shareWhatsApp}
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid: Visual 4-Seat Table + Host Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Visual 4-Seat Table */}
          <div className="lg:col-span-8 glass-panel rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              {/* Top Seat: Seat 2 (Team A) */}
              <div className="sm:col-start-2">{renderSeatCard(2)}</div>

              {/* Middle Row: Seat 3 (Left, Team B) | Center Crest | Seat 1 (Right, Team B) */}
              <div className="sm:col-start-1 sm:row-start-2">
                {renderSeatCard(3)}
              </div>

              <div className="hidden sm:flex sm:col-start-2 sm:row-start-2 flex-col items-center justify-center py-4">
                <div className="relative w-28 h-28 rounded-full border border-amber-400/35 bg-black/30 flex items-center justify-center shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/omi-logo.png"
                    alt="Omi Table"
                    className="w-20 h-20 object-contain opacity-90"
                  />
                </div>
                <span className="mt-2 text-[11px] font-semibold text-white/50 text-center">
                  ↺ {prefs.language === "si" ? "වාමාවර්තව" : "Counter-Clockwise"}
                </span>
              </div>

              <div className="sm:col-start-3 sm:row-start-2">
                {renderSeatCard(1)}
              </div>

              {/* Bottom Seat: Seat 0 (Team A) */}
              <div className="sm:col-start-2 sm:row-start-3">
                {renderSeatCard(0)}
              </div>
            </div>

            {mySeat === null ? (
              <p className="mt-4 text-center text-xs text-amber-200/80">
                {dict.spectatorNotice} — {dict.clickToSit}
              </p>
            ) : null}
          </div>

          {/* Right Panel: Host Controls & Options */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel rounded-3xl border border-white/15 p-5 shadow-2xl space-y-5">
              <h2 className="text-base font-extrabold text-amber-200">
                {dict.roomOptions}
              </h2>

              {/* Turn Timer */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/65 mb-2">
                  <Timer className="w-3.5 h-3.5 text-amber-300" />
                  {dict.turnTimer}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([0, 15, 30, 45] as TurnTimerOption[]).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        soundEngine.playClick();
                        updateRoomSettings(room.code, { turnTimer: sec });
                      }}
                      className={`rounded-xl py-2 text-xs font-bold border transition ${
                        room.settings.turnTimer === sec
                          ? "bg-amber-400/20 border-amber-400 text-amber-200"
                          : "bg-white/5 border-white/10 text-white/65 hover:bg-white/10"
                      } disabled:cursor-default`}
                    >
                      {sec === 0 ? dict.timerOff : `${sec}${dict.secondsShort}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kapothi vs Basthe label */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/65 mb-2">
                  {dict.sweepTermLabel}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["kapothi", "basthe"] as KapothiLabel[]).map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        soundEngine.playClick();
                        updateRoomSettings(room.code, { kapothiLabel: pref });
                      }}
                      className={`rounded-xl py-2 px-3 text-xs font-bold border transition ${
                        room.settings.kapothiLabel === pref
                          ? "bg-amber-400/20 border-amber-400 text-amber-200"
                          : "bg-white/5 border-white/10 text-white/65 hover:bg-white/10"
                      } disabled:cursor-default`}
                    >
                      {dict.sweepName(pref)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Host Actions */}
              {isHost ? (
                <div className="pt-2 space-y-2.5 border-t border-white/10">
                  {!allFilled ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        fillEmptySeatsWithBots(room.code);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 py-2.5 px-4 text-xs sm:text-sm font-bold text-amber-200 transition"
                    >
                      <Bot className="w-4 h-4" />
                      {dict.fillWithBots}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={!allFilled || starting}
                    onClick={handleStart}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed py-3.5 px-4 text-sm sm:text-base font-black text-slate-950 shadow-xl shadow-amber-500/25 transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {dict.startGame}
                  </button>

                  {!allFilled ? (
                    <p className="text-[11px] text-center text-white/55 leading-relaxed">
                      {dict.waitingForPlayers}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleDisband}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 py-2 px-3 text-xs font-semibold text-rose-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {dict.disbandRoom}
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-white/10 text-center">
                  <p className="text-xs font-semibold text-amber-200/80 animate-pulse">
                    {dict.waitingForHost}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
