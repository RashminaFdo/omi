"use client";

import React, { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { GameTable } from "@/components/GameTable";
import { LobbyView } from "@/components/LobbyView";
import { TableBackdrop } from "@/components/TableBackdrop";
import { TopBar } from "@/components/TopBar";
import { ensureAnonymousUser } from "@/lib/firebase";
import { chooseBotCard, chooseBotTrumpSuit } from "@/lib/omiEngine";
import {
  attachPresence,
  commitTrickAdvance,
  findPlayerSeat,
  joinOrReconnectSeat,
  leaveLobbySeat,
  normalizeCode,
  submitCardPlay,
  submitTrumpChoice,
  subscribeToRoom,
} from "@/lib/roomService";
import { useSettings } from "@/lib/settings";
import { soundEngine } from "@/lib/sound";
import type { RoomData, SeatIndex } from "@/lib/types";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const code = normalizeCode(resolvedParams.code);
  const router = useRouter();
  const { prefs, dict, hydrated, setNickname } = useSettings();

  const [uid, setUid] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [roomLoaded, setRoomLoaded] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Direct-invite nickname prompt
  const [tempName, setTempName] = useState("");
  const [joiningSeat, setJoiningSeat] = useState(false);
  const hasAttemptedAutoJoin = useRef(false);

  // 1. Authenticate anonymously & subscribe to room RTDB state
  useEffect(() => {
    let active = true;
    let unsubRoom: (() => void) | null = null;

    ensureAnonymousUser()
      .then((user) => {
        if (!active) return;
        setUid(user.uid);
        unsubRoom = subscribeToRoom(code, (data) => {
          if (!active) return;
          setRoom(data);
          setRoomLoaded(true);
        });
      })
      .catch((err) => {
        if (!active) return;
        setAuthError(
          err instanceof Error ? err.message : "Authentication failed."
        );
        setRoomLoaded(true);
      });

    return () => {
      active = false;
      if (unsubRoom) unsubRoom();
    };
  }, [code]);

  const mySeat = findPlayerSeat(room, uid);
  const isHost = Boolean(room && uid && room.hostUid === uid);
  const needsName = Boolean(
    hydrated &&
      roomLoaded &&
      room &&
      uid &&
      mySeat === null &&
      room.status === "lobby" &&
      !prefs.nickname.trim()
  );

  // 2. Auto-join seat if user already has a saved nickname
  useEffect(() => {
    if (!hydrated || !roomLoaded || !room || !uid || mySeat !== null) return;
    if (hasAttemptedAutoJoin.current) return;

    if (prefs.nickname.trim()) {
      hasAttemptedAutoJoin.current = true;
      joinOrReconnectSeat(code, uid, prefs.nickname).catch(() => {});
    }
  }, [hydrated, roomLoaded, room, uid, mySeat, prefs.nickname, code]);

  // 3. Presence tracking via Firebase onDisconnect
  const roomCodePresent = Boolean(room?.code);
  useEffect(() => {
    if (!roomCodePresent || mySeat === null) return;
    return attachPresence(code, mySeat);
  }, [code, roomCodePresent, mySeat]);

  // 4. Host Engine (with offline-host fallback): Trick Complete Auto-Advance
  const game = room?.game ?? null;
  const gamePhase = game?.phase;
  const actionSeq = game?.actionSeq ?? -1;
  const fast = prefs.animationSpeed === "fast";

  // Designate an active orchestrator: the host if online, otherwise the first online human seat
  const hostSeatPlayer = room
    ? Object.values(room.seats).find((s) => s && s.uid === room.hostUid)
    : null;
  const firstOnlineHumanUid = room
    ? ([0, 1, 2, 3] as SeatIndex[])
        .map((s) => room.seats[String(s)])
        .find((p) => p && !p.isBot && p.online)?.uid ?? null
    : null;
  const isOrchestrator = Boolean(
    uid &&
      (isHost ||
        (!hostSeatPlayer?.online && firstOnlineHumanUid === uid))
  );

  useEffect(() => {
    if (!isOrchestrator || !game || game.phase !== "TRICK_COMPLETE") return;
    const delay = fast ? 850 : 1450;
    const timer = window.setTimeout(() => {
      commitTrickAdvance(code, game.actionSeq).catch(() => {});
    }, delay);
    return () => window.clearTimeout(timer);
  }, [isOrchestrator, code, gamePhase, actionSeq, fast, game]);

  // 5. Orchestrator Engine: Smart AI Bot Moves (Trump Selection & Trick Play)
  useEffect(() => {
    if (!isOrchestrator || !room || !game) return;
    if (game.phase !== "SELECT_TRUMP" && game.phase !== "PLAYING") return;

    const actingSeat: SeatIndex =
      game.phase === "SELECT_TRUMP" ? game.trumpCaller : game.currentTurn;
    const actingPlayer = room.seats[String(actingSeat)];

    if (!actingPlayer || !actingPlayer.isBot) return;

    const delay = fast ? 480 : 850;
    const timer = window.setTimeout(() => {
      const hand = game.hands[String(actingSeat)] ?? [];
      if (hand.length === 0) return;

      if (game.phase === "SELECT_TRUMP") {
        const suit = chooseBotTrumpSuit(hand);
        submitTrumpChoice(code, actingSeat, suit).catch(() => {});
      } else if (game.phase === "PLAYING" && game.trumpSuit) {
        const card = chooseBotCard(
          hand,
          game.currentTrick,
          game.trumpSuit,
          actingSeat
        );
        submitCardPlay(code, actingSeat, card.id).catch(() => {});
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [isOrchestrator, code, room, game, gamePhase, actionSeq, fast]);

  // 6. Orchestrator Engine: Turn Timer Auto-Move for Human Players
  useEffect(() => {
    if (!isOrchestrator || !room || !game) return;
    const limitSec = room.settings.turnTimer;
    if (limitSec <= 0) return;
    if (game.phase !== "SELECT_TRUMP" && game.phase !== "PLAYING") return;

    const actingSeat: SeatIndex =
      game.phase === "SELECT_TRUMP" ? game.trumpCaller : game.currentTurn;
    const actingPlayer = room.seats[String(actingSeat)];
    if (!actingPlayer || actingPlayer.isBot) return;

    const elapsedMs = Date.now() - game.turnStartedAt;
    const remainingMs = Math.max(400, limitSec * 1000 - elapsedMs + 400);

    const timer = window.setTimeout(() => {
      const hand = game.hands[String(actingSeat)] ?? [];
      if (hand.length === 0) return;
      if (game.phase === "SELECT_TRUMP") {
        const suit = chooseBotTrumpSuit(hand);
        submitTrumpChoice(code, actingSeat, suit).catch(() => {});
      } else if (game.phase === "PLAYING" && game.trumpSuit) {
        const card = chooseBotCard(
          hand,
          game.currentTrick,
          game.trumpSuit,
          actingSeat
        );
        submitCardPlay(code, actingSeat, card.id).catch(() => {});
      }
    }, remainingMs);

    return () => window.clearTimeout(timer);
  }, [isOrchestrator, code, room, game, gamePhase, actionSeq]);

  const handleConfirmInviteName = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tempName.trim();
    if (!clean || !uid || joiningSeat) return;
    setJoiningSeat(true);
    try {
      soundEngine.playClick();
      setNickname(clean);
      hasAttemptedAutoJoin.current = true;
      await joinOrReconnectSeat(code, uid, clean);
    } finally {
      setJoiningSeat(false);
    }
  };

  const handleLeave = async () => {
    if (uid && room) {
      await leaveLobbySeat(code, uid).catch(() => {});
    }
    router.push("/");
  };

  return (
    <TableBackdrop>
      <TopBar roomCode={code} onLeave={handleLeave} />

      {!roomLoaded ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-3 text-amber-200">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-semibold">{dict.joining}</p>
        </div>
      ) : authError || !room ? (
        <div className="relative z-10 flex-1 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl border border-rose-400/35 p-6 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h1 className="text-lg font-extrabold text-white">
              {authError ?? dict.roomNotFound}
            </h1>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              {dict.backHome}
            </button>
          </div>
        </div>
      ) : room.game && room.status !== "lobby" ? (
        <GameTable
          room={room}
          game={room.game}
          uid={uid ?? ""}
          mySeat={mySeat}
        />
      ) : (
        <LobbyView
          room={room}
          uid={uid ?? ""}
          mySeat={mySeat}
          nickname={prefs.nickname || tempName || "Player"}
        />
      )}

      {/* Nickname Onboarding Modal for Direct Invite Link Visitors */}
      {needsName && room ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <motion.form
            onSubmit={handleConfirmInviteName}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-3xl border border-amber-400/40 bg-[#0b1512]/95 p-6 text-center text-white shadow-2xl space-y-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/omi-logo.png"
              alt="Omi"
              className="w-16 h-16 mx-auto object-contain"
            />
            <div>
              <h2 className="text-xl font-black text-amber-200">
                {dict.welcomeToRoom(room.code)}
              </h2>
              <p className="text-xs text-white/65 mt-1">
                {dict.enterNameToJoin}
              </p>
            </div>
            <input
              type="text"
              autoFocus
              maxLength={20}
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder={dict.nicknamePlaceholder}
              className="w-full rounded-xl border border-white/15 bg-black/45 px-4 py-3 text-center text-base font-bold text-white placeholder:text-white/35 focus:border-amber-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!tempName.trim() || joiningSeat}
              className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 py-3 text-sm font-black text-slate-950 transition"
            >
              {dict.joinTable}
            </button>
          </motion.form>
        </div>
      ) : null}
    </TableBackdrop>
  );
}
