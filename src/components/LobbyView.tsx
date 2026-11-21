"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeftRight,
  Bot,
  Check,
  Copy,
  Crown,
  GripVertical,
  Link2,
  Play,
  QrCode,
  Share2,
  Shuffle,
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
  shuffleTeams,
  startMatch,
  swapSeats,
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
  const [copyFailed, setCopyFailed] = useState(false);
  const [waMenuOpen, setWaMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busySeat, setBusySeat] = useState<SeatIndex | null>(null);
  const [shuffling, setShuffling] = useState(false);

  // Host drag-and-drop & mobile tap-to-swap state
  const [draggingSeat, setDraggingSeat] = useState<SeatIndex | null>(null);
  const [dragOverSeat, setDragOverSeat] = useState<SeatIndex | null>(null);
  const [selectedSwapSeat, setSelectedSwapSeat] = useState<SeatIndex | null>(
    null
  );

  const isHost = room.hostUid === uid;
  const filledCount = ([0, 1, 2, 3] as SeatIndex[]).filter(
    (s) => room.seats[String(s)] !== null
  ).length;
  const allFilled = filledCount === 4;

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${room.code}`
      : `/room/${room.code}`;

  const copyText = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      let clipboardTimer: number | undefined;
      const clipboardResult = await Promise.race([
        navigator.clipboard.writeText(text).then(
          () => true,
          () => false
        ),
        new Promise<boolean>((resolve) => {
          clipboardTimer = window.setTimeout(() => resolve(false), 700);
        }),
      ]);
      if (clipboardTimer !== undefined) {
        window.clearTimeout(clipboardTimer);
      }
      if (clipboardResult) return;
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.readOnly = true;
    input.style.position = "fixed";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);

    try {
      if (!document.execCommand("copy")) {
        throw new Error("Clipboard copy failed.");
      }
    } finally {
      input.remove();
    }
  };

  const handleCopyLink = async () => {
    setCopyFailed(false);
    try {
      await copyText(inviteUrl);
      setCopiedLink(true);
      soundEngine.playClick();
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setCopiedLink(false);
      setCopyFailed(true);
    }
  };

  const handleCopyCode = async () => {
    setCopyFailed(false);
    try {
      await copyText(room.code);
      setCopiedCode(true);
      soundEngine.playClick();
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(false);
      setCopyFailed(true);
    }
  };

  const shareToWhatsAppApp = (mode: "normal" | "business" | "native") => {
    soundEngine.playClick();
    setWaMenuOpen(false);
    const msg = dict.whatsAppMessage(room.code, inviteUrl);
    const encoded = encodeURIComponent(msg);
    const webFallback = `https://api.whatsapp.com/send?text=${encoded}`;

    if (mode === "native" && typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `Omi Room ${room.code}`,
          text: msg,
          url: inviteUrl,
        })
        .catch(() => {});
      return;
    }

    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isAndroid = /Android/i.test(ua);

    if (isAndroid) {
      // Target exact Android package: Normal WhatsApp (com.whatsapp) or WhatsApp Business (com.whatsapp.w4b)
      // Automatically falls back to api.whatsapp.com (which opens whichever WhatsApp is installed)
      const pkg = mode === "business" ? "com.whatsapp.w4b" : "com.whatsapp";
      const intentUrl = `intent://send?text=${encoded}#Intent;scheme=whatsapp;package=${pkg};S.browser_fallback_url=${encodeURIComponent(
        webFallback
      )};end`;
      window.location.href = intentUrl;
      return;
    }

    if (mode === "normal") {
      // On iOS/Desktop, whatsapp:// protocol prefers normal WhatsApp over Business web redirect
      const isIOS = /iPhone|iPad|iPod/i.test(ua);
      if (isIOS) {
        window.location.href = `whatsapp://send?text=${encoded}`;
        return;
      }
    }

    window.open(webFallback, "_blank", "noopener,noreferrer");
  };

  const handleSeatClick = async (seat: SeatIndex) => {
    if (busySeat !== null) return;

    // Host tap-to-swap flow (works seamlessly on mobile & desktop!)
    if (isHost) {
      if (selectedSwapSeat !== null) {
        if (selectedSwapSeat === seat) {
          setSelectedSwapSeat(null);
          return;
        }
        const from = selectedSwapSeat;
        setSelectedSwapSeat(null);
        setBusySeat(seat);
        try {
          soundEngine.playCardFlip();
          await swapSeats(room.code, from, seat);
        } finally {
          setBusySeat(null);
        }
        return;
      }

      // Clicking an occupied seat as host selects it to swap with another seat
      if (room.seats[String(seat)] !== null) {
        soundEngine.playClick();
        setSelectedSwapSeat(seat);
        return;
      }
    }

    // Standard open-seat click: move yourself into that seat
    if (room.seats[String(seat)] !== null) return;
    setBusySeat(seat);
    try {
      soundEngine.playClick();
      await switchSeat(room.code, uid, nickname, seat, deviceId);
    } finally {
      setBusySeat(null);
    }
  };

  // HTML5 Drag & Drop handlers for Host
  const handleDragStart = (e: React.DragEvent, seat: SeatIndex) => {
    if (!isHost || !room.seats[String(seat)]) return;
    setDraggingSeat(seat);
    setSelectedSwapSeat(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(seat));
  };

  const handleDragOver = (e: React.DragEvent, seat: SeatIndex) => {
    if (!isHost || draggingSeat === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverSeat !== seat) {
      setDragOverSeat(seat);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetSeat: SeatIndex) => {
    e.preventDefault();
    if (!isHost) return;
    const raw = e.dataTransfer.getData("text/plain");
    const fromSeat =
      draggingSeat !== null
        ? draggingSeat
        : raw !== ""
        ? (Number(raw) as SeatIndex)
        : null;
    setDraggingSeat(null);
    setDragOverSeat(null);

    if (fromSeat === null || fromSeat === targetSeat) return;
    setBusySeat(targetSeat);
    try {
      soundEngine.playCardFlip();
      await swapSeats(room.code, fromSeat, targetSeat);
    } finally {
      setBusySeat(null);
    }
  };

  const handleDragEnd = () => {
    setDraggingSeat(null);
    setDragOverSeat(null);
  };

  const handleShuffleTeams = async () => {
    if (!isHost || filledCount < 2 || shuffling) return;
    setShuffling(true);
    setSelectedSwapSeat(null);
    try {
      soundEngine.playCardDeal();
      await shuffleTeams(room.code);
    } finally {
      setTimeout(() => setShuffling(false), 320);
    }
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
    setSelectedSwapSeat(null);
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

  const handleDisband = async () => {
    if (!isHost) return;
    soundEngine.playClick();
    await deleteRoom(room.code).catch(() => {});
    onRoomClosed();
  };

  const renderSeatCard = (seat: SeatIndex) => {
    const player = room.seats[String(seat)];
    const team = seat === 0 || seat === 2 ? "A" : "B";
    const isMe = player?.uid === uid;
    const isSeatHost = player?.uid === room.hostUid;
    const isSelectedForSwap = selectedSwapSeat === seat;
    const isDropTarget =
      (dragOverSeat === seat && draggingSeat !== seat) ||
      (selectedSwapSeat !== null && selectedSwapSeat !== seat);
    const isBeingDragged = draggingSeat === seat;

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
        <div
          onDragOver={(e) => handleDragOver(e, seat)}
          onDragLeave={() =>
            setDragOverSeat((cur) => (cur === seat ? null : cur))
          }
          onDrop={(e) => handleDrop(e, seat)}
          className={`relative flex min-h-[144px] flex-col rounded-2xl border border-dashed p-2 transition sm:min-h-[128px] sm:p-3 ${
            isDropTarget
              ? "border-amber-400 bg-amber-400/15 shadow-[0_0_24px_rgba(251,191,36,0.3)] scale-[1.02]"
              : "border-white/25 bg-black/25 hover:bg-white/[0.07] hover:border-amber-400/60"
          }`}
        >
          <button
            type="button"
            onClick={() => handleSeatClick(seat)}
            disabled={busySeat !== null}
            aria-label={`${team === "A" ? dict.teamA : dict.teamB}: ${dict.emptySeat}`}
            className="group relative flex min-h-[92px] w-full flex-1 flex-col items-center justify-center gap-2 rounded-xl p-2 text-center disabled:opacity-60"
          >
            <span
              className={`absolute top-1 left-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${teamPill}`}
            >
              {team === "A" ? dict.teamA : dict.teamB}
            </span>
            <span className="w-9 h-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/70 group-hover:text-amber-300 group-hover:border-amber-400/50 transition">
              {isDropTarget ? (
                <ArrowLeftRight className="w-4 h-4 text-amber-300" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </span>
            <span>
              <span className="block text-xs font-bold text-white/90">{dict.emptySeat}</span>
              <span className="block text-[11px] text-white/65">
                {isDropTarget ? dict.tapSeatToSwap : dict.clickToSit}
              </span>
            </span>
          </button>
          {isHost && !selectedSwapSeat ? (
            <button
              type="button"
              onClick={(e) => handleAddBot(e, seat)}
              disabled={busySeat !== null}
              className="mt-1 min-h-11 self-center inline-flex items-center justify-center gap-1 rounded-full bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 px-3 text-[11px] font-bold text-amber-100 transition disabled:opacity-50"
            >
              <Bot className="w-3.5 h-3.5" />
              {dict.addBot}
            </button>
          ) : null}
        </div>
      );
    }

    return (
      <div
        draggable={isHost}
        onDragStart={(e) => handleDragStart(e, seat)}
        onDragOver={(e) => handleDragOver(e, seat)}
        onDragLeave={() =>
          setDragOverSeat((cur) => (cur === seat ? null : cur))
        }
        onDrop={(e) => handleDrop(e, seat)}
        onDragEnd={handleDragEnd}
        className={`relative flex flex-col rounded-2xl border p-2 min-h-[128px] text-center shadow-lg transition select-none sm:p-3 ${teamColor} ${
          isHost ? "cursor-grab active:cursor-grabbing" : ""
        } ${
          isSelectedForSwap
            ? "ring-2 ring-amber-300 bg-amber-400/20 shadow-[0_0_26px_rgba(251,191,36,0.45)] scale-[1.03]"
            : isDropTarget
            ? "ring-2 ring-amber-400/90 border-amber-400 bg-amber-400/15 scale-[1.02]"
            : isMe
            ? "ring-2 ring-amber-400/75"
            : ""
        } ${isBeingDragged ? "opacity-50 scale-95" : ""}`}
      >
        <button
          type="button"
          disabled={busySeat !== null || (!isHost && player.uid !== uid)}
          onClick={() => handleSeatClick(seat)}
          aria-pressed={isSelectedForSwap}
          aria-label={`${player.name}${isMe ? `, ${dict.youBadge}` : ""}${isSeatHost ? `, ${dict.hostBadge}` : ""}`}
          className="relative flex min-h-[112px] w-full flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-1 pt-3 text-center disabled:opacity-60"
        >
          <span
            className={`absolute top-0 left-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${teamPill}`}
          >
            {team === "A" ? dict.teamA : dict.teamB}
          </span>

          <span className="absolute top-0 right-0 inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/80">
            {isHost ? (
              <GripVertical className="w-3.5 h-3.5 text-white/55" />
            ) : null}
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

          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300/25 to-amber-600/25 border border-amber-300/40 flex items-center justify-center text-base font-extrabold text-amber-100">
            {player.isBot ? (
              <Bot className="w-5 h-5" />
            ) : (
              player.name.slice(0, 1).toUpperCase()
            )}
          </span>

          <span className="max-w-full">
            <span className="block text-sm font-bold text-white truncate max-w-[140px]">
              {player.name}
            </span>
            <span className="flex flex-wrap items-center justify-center gap-1 mt-1">
              {isMe ? (
                <span className="rounded-full bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                  {dict.youBadge}
                </span>
              ) : null}
              {isSeatHost ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                  <Crown className="w-2.5 h-2.5" />
                  {dict.hostBadge}
                </span>
              ) : null}
              {player.isBot ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/85">
                  {dict.botBadge}
                </span>
              ) : null}
            </span>
          </span>

          {isSelectedForSwap ? (
            <span className="mt-0.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
              {dict.tapSeatToSwap}
            </span>
          ) : null}
        </button>
        {isHost && player.isBot ? (
          <button
            type="button"
            onClick={(e) => handleRemoveBot(e, seat)}
            disabled={busySeat !== null}
            className="min-h-11 self-center inline-flex items-center justify-center gap-1 rounded-full bg-rose-500/15 hover:bg-rose-500/30 border border-rose-400/35 px-2.5 text-[10px] font-semibold text-rose-100 transition disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            {dict.removeBot}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-3 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:py-5">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
        {/* Invite Banner */}
        <div className="glass-panel rounded-3xl border border-white/15 p-4 sm:p-5 shadow-2xl">
          <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-4">
            <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-3.5">
              <div className="w-fit rounded-2xl bg-amber-400/15 border border-amber-400/40 px-4 py-2.5 text-center">
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
                <p className="text-xs sm:text-sm text-white/65 flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Users className="w-3.5 h-3.5 text-amber-300" />
                  <span>{filledCount} / 4</span>
                  <span className="text-white/35">•</span>
                  <span className="min-[420px]:hidden">
                    {dict.teamA} vs {dict.teamB}
                  </span>
                  <span className="hidden min-[420px]:inline">
                    {dict.teamA} ({dict.redTokens}) vs {dict.teamB} (
                    {dict.blackTokens})
                  </span>
                </p>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-2.5 sm:px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition"
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
                className="min-h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/15 px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm font-semibold text-white transition"
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
                onClick={() => {
                  soundEngine.playClick();
                  setWaMenuOpen(false);
                  setQrOpen(true);
                }}
                className="min-h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/15 hover:bg-amber-400/25 px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm font-bold text-amber-200 transition"
              >
                <QrCode className="w-4 h-4" />
                {dict.showQrCode}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setWaMenuOpen((v) => !v);
                  }}
                  aria-expanded={waMenuOpen}
                  className="min-h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm font-bold text-emerald-100 transition"
                >
                  <Share2 className="w-4 h-4" />
                  {dict.shareWhatsApp}
                </button>

                {waMenuOpen ? (
                  <div className="absolute right-0 mt-2 z-40 w-52 rounded-2xl border border-emerald-400/35 bg-[#091511]/98 p-1.5 shadow-2xl backdrop-blur-md space-y-1">
                    <button
                      type="button"
                      onClick={() => shareToWhatsAppApp("normal")}
                      className="w-full text-left rounded-xl px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 transition"
                    >
                      💬 {dict.shareWhatsAppNormal}
                    </button>
                    <button
                      type="button"
                      onClick={() => shareToWhatsAppApp("business")}
                      className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 transition"
                    >
                      💼 {dict.shareWhatsAppBusiness}
                    </button>
                    {typeof navigator !== "undefined" && "share" in navigator ? (
                      <button
                        type="button"
                        onClick={() => shareToWhatsAppApp("native")}
                        className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/15 transition border-t border-white/10"
                      >
                        📤 {dict.shareOtherApps}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            {copyFailed ? (
              <p role="alert" className="text-center text-xs font-semibold text-rose-200">
                {dict.copyFailed}
              </p>
            ) : null}
          </div>
        </div>

        {/* Main Grid: Visual 4-Seat Table + Host Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Visual 4-Seat Table */}
          <div className="lg:col-span-8 glass-panel rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl space-y-4">
            {/* Host Team-Arrangement Bar (Drag hint + Shuffle Teams button) */}
            {isHost ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                <p className="text-[11px] sm:text-xs text-white/65 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{dict.dragToArrange}</span>
                </p>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  disabled={filledCount < 2 || shuffling}
                  onClick={handleShuffleTeams}
                  className="min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/45 bg-amber-400/15 hover:bg-amber-400/25 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-xs font-bold text-amber-100 transition shrink-0"
                >
                  <Shuffle
                    className={`w-3.5 h-3.5 ${shuffling ? "animate-spin" : ""}`}
                  />
                  {dict.shuffleTeams}
                </motion.button>
              </div>
            ) : null}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 items-center">
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
              <p className="text-center text-xs text-amber-200/80">
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
                      aria-pressed={room.settings.turnTimer === sec}
                      className={`min-h-11 rounded-xl py-2 text-xs font-bold border transition ${
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
                      aria-pressed={room.settings.kapothiLabel === pref}
                      className={`min-h-11 rounded-xl py-2 px-3 text-xs font-bold border transition ${
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
                      className="min-h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 py-2.5 px-4 text-xs sm:text-sm font-bold text-amber-100 transition"
                    >
                      <Bot className="w-4 h-4" />
                      {dict.fillWithBots}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={!allFilled || starting}
                    onClick={handleStart}
                    className="min-h-12 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed py-3 px-4 text-sm sm:text-base font-black text-slate-950 shadow-xl shadow-amber-500/25 transition"
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
                    className="min-h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 py-2 px-3 text-xs font-semibold text-rose-100 transition"
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
      {/* Host QR Code Invite Modal */}
      <AnimatePresence>
        {qrOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setQrOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-3xl border border-amber-400/40 bg-[#0a1411]/98 p-6 text-center text-white shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-amber-200 flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  {dict.qrInviteTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setQrOpen(false)}
                  className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
                  aria-label={dict.close}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mx-auto inline-flex items-center justify-center rounded-2xl bg-white p-3.5 shadow-xl">
                <QRCodeSVG
                  value={inviteUrl}
                  size={208}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#06130f"
                />
              </div>

              <div>
                <div className="font-mono text-2xl font-black tracking-[0.22em] text-amber-300">
                  {room.code}
                </div>
                <p className="text-xs text-white/65 mt-1">
                  {dict.qrInviteSubtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setQrOpen(false)}
                className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 py-2.5 text-sm font-bold text-slate-950 transition"
              >
                {dict.close}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
