import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { ensureAnonymousUser, getFirebaseDb } from "./firebase";
import {
  advanceAfterTrick,
  applyBlindTrumpCardSelection,
  applyCardPlay,
  applyTrumpSelection,
  createHandState,
  finalizeBlindTrumpDeal,
  startNextHand,
} from "./omiEngine";
import type {
  BlindCardPosition,
  Card,
  EmoteEvent,
  EmoteKey,
  GameState,
  RoomData,
  RoomSettings,
  SeatIndex,
  SeatPlayer,
  Suit,
  TrickPlay,
} from "./types";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes 0, O, 1, I
const BOT_NAMES = ["Kasun", "Nimali", "Ruwan", "Tharushi", "Dilshan", "Chathuri"];
const DEVICE_ID_KEY = "omi_device_id_v1";

export const OFFLINE_TAKEOVER_MS = 15_000; // 15 seconds before AI bot subs in
export const FINISHED_ROOM_TTL_MS = 180_000; // 3 minutes auto-cleanup after match ends

/**
 * Returns a persistent unique Machine / Device ID stored in localStorage.
 * Ensures only the original player's device can reclaim a disconnected/bot-subbed seat.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length >= 12) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function normalizeCards(val: unknown): Card[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean) as Card[];
  if (typeof val === "object") {
    return Object.values(val as Record<string, Card>).filter(Boolean);
  }
  return [];
}

function normalizeWonTricks(val: unknown): Card[][] {
  if (!val) return [];
  const list = Array.isArray(val)
    ? val
    : typeof val === "object"
    ? Object.values(val as Record<string, unknown>)
    : [];
  return list
    .map((trick) => normalizeCards(trick))
    .filter((cards) => cards.length > 0);
}

function normalizeTrick(val: unknown): TrickPlay[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean) as TrickPlay[];
  if (typeof val === "object") {
    return Object.values(val as Record<string, TrickPlay>).filter(Boolean);
  }
  return [];
}

export function normalizeGameState(
  raw: GameState | null | undefined
): GameState | null {
  if (!raw) return null;
  const handsObj = (raw.hands ?? {}) as Record<string, unknown>;
  const pendingObj = raw.pendingSecondDeal as
    | Record<string, unknown>
    | null
    | undefined;
  const wonObj = (raw.wonTricksBySeat ?? {}) as Record<string, unknown>;

  return {
    phase: raw.phase,
    handNumber: raw.handNumber ?? 1,
    dealerSeat: (raw.dealerSeat ?? 3) as SeatIndex,
    trumpCaller: (raw.trumpCaller ?? 0) as SeatIndex,
    trumpSuit: raw.trumpSuit ?? null,
    revealedTrumpCard: raw.revealedTrumpCard ?? null,
    revealedTrumpCardPosition: raw.revealedTrumpCardPosition ?? null,
    currentTurn: (raw.currentTurn ?? 0) as SeatIndex,
    turnStartedAt: raw.turnStartedAt ?? Date.now(),
    trickNumber: raw.trickNumber ?? 1,
    trickLeader: (raw.trickLeader ?? 0) as SeatIndex,
    currentTrick: normalizeTrick(raw.currentTrick),
    lastTrickWinner:
      raw.lastTrickWinner === undefined ? null : raw.lastTrickWinner,
    lastTrickWinningCardId: raw.lastTrickWinningCardId ?? null,
    lastTrickCut: Boolean(raw.lastTrickCut),
    hands: {
      "0": normalizeCards(handsObj["0"]),
      "1": normalizeCards(handsObj["1"]),
      "2": normalizeCards(handsObj["2"]),
      "3": normalizeCards(handsObj["3"]),
    },
    pendingSecondDeal: pendingObj
      ? {
          "0": normalizeCards(pendingObj["0"]),
          "1": normalizeCards(pendingObj["1"]),
          "2": normalizeCards(pendingObj["2"]),
          "3": normalizeCards(pendingObj["3"]),
        }
      : null,
    wonTricksBySeat: {
      "0": normalizeWonTricks(wonObj["0"]),
      "1": normalizeWonTricks(wonObj["1"]),
      "2": normalizeWonTricks(wonObj["2"]),
      "3": normalizeWonTricks(wonObj["3"]),
    },
    tricksWon: {
      A: raw.tricksWon?.A ?? 0,
      B: raw.tricksWon?.B ?? 0,
    },
    scores: {
      A: raw.scores?.A ?? 0,
      B: raw.scores?.B ?? 0,
    },
    carryOverBonus: raw.carryOverBonus ?? 0,
    lastHandResult: raw.lastHandResult ?? null,
    matchWinner: raw.matchWinner ?? null,
    actionSeq: raw.actionSeq ?? 0,
  };
}

export function normalizeRoomData(
  raw: RoomData | null | undefined
): RoomData | null {
  if (!raw || !raw.code) return null;
  const seatsRaw = (raw.seats ?? {}) as Record<
    string,
    SeatPlayer | null | undefined
  >;
  return {
    code: raw.code,
    hostUid: raw.hostUid,
    status: raw.status ?? "lobby",
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: raw.updatedAt ?? Date.now(),
    finishedAt: raw.finishedAt ?? null,
    settings: {
      turnTimer: raw.settings?.turnTimer ?? 30,
      kapothiLabel: raw.settings?.kapothiLabel ?? "kapothi",
    },
    seats: {
      "0": seatsRaw["0"] ?? null,
      "1": seatsRaw["1"] ?? null,
      "2": seatsRaw["2"] ?? null,
      "3": seatsRaw["3"] ?? null,
    },
    game: normalizeGameState(raw.game),
    emotes: raw.emotes ?? {},
  };
}

/**
 * Finds the seat belonging to this player by Firebase Auth UID OR persistent Machine/Device ID.
 * Only the matching device/UID can reclaim a disconnected or bot-taken-over human seat.
 */
export function findPlayerSeat(
  room: RoomData | null,
  uid: string | null,
  deviceId?: string | null
): SeatIndex | null {
  if (!room) return null;
  for (const s of [0, 1, 2, 3] as SeatIndex[]) {
    const p = room.seats[String(s)];
    if (!p || p.isBot) continue;
    if (uid && p.uid === uid) return s;
    if (deviceId && p.deviceId && p.deviceId === deviceId) return s;
  }
  return null;
}

export async function createRoom(playerName: string): Promise<string> {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const deviceId = getOrCreateDeviceId();
  const cleanName = playerName.trim().slice(0, 20) || "Player";

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const roomRef = ref(db, `rooms/${code}`);
    const existing = await get(roomRef);
    if (existing.exists()) continue;

    const now = Date.now();
    const initialRoom: RoomData = {
      code,
      hostUid: user.uid,
      status: "lobby",
      createdAt: now,
      updatedAt: now,
      finishedAt: null,
      settings: {
        turnTimer: 30,
        kapothiLabel: "kapothi",
      },
      seats: {
        "0": {
          uid: user.uid,
          name: cleanName,
          isBot: false,
          online: true,
          joinedAt: now,
          deviceId,
          disconnectedAt: null,
          botTakeover: false,
        },
        "1": null,
        "2": null,
        "3": null,
      },
      game: null,
    };

    await set(roomRef, initialRoom);
    return code;
  }

  throw new Error("Could not allocate a unique room code. Please try again.");
}

export async function checkRoomExists(code: string): Promise<boolean> {
  await ensureAnonymousUser();
  const db = getFirebaseDb();
  const normalized = normalizeCode(code);
  if (normalized.length !== 6) return false;
  const snap = await get(ref(db, `rooms/${normalized}/code`));
  return snap.exists();
}

export function subscribeToRoom(
  code: string,
  callback: (room: RoomData | null) => void
): () => void {
  const db = getFirebaseDb();
  const roomRef = ref(db, `rooms/${code}`);
  return onValue(roomRef, (snap) => {
    const data = snap.val() as RoomData | null;
    callback(normalizeRoomData(data));
  });
}

/**
 * Seats a joining player in lobby, OR allows ONLY the original player (matched by UID or Machine/Device ID)
 * to reclaim their seat mid-game — even if an AI bot temporarily took over after the 15s timeout!
 */
export async function joinOrReconnectSeat(
  code: string,
  uid: string,
  playerName: string,
  deviceId: string
): Promise<{ seated: boolean; seat: SeatIndex | null }> {
  const db = getFirebaseDb();
  const cleanName = playerName.trim().slice(0, 20) || "Player";
  let assignedSeat: SeatIndex | null = null;

  await runTransaction(ref(db, `rooms/${code}`), (current) => {
    const room = normalizeRoomData(current as RoomData | null);
    if (!room) return current;

    // 1. Reclaim existing seat if UID or Device/Machine ID matches
    const existingSeat = findPlayerSeat(room, uid, deviceId);
    if (existingSeat !== null) {
      const seatKey = String(existingSeat);
      const seatObj = room.seats[seatKey];
      if (seatObj) {
        const wasHost = room.hostUid === seatObj.uid;
        room.seats[seatKey] = {
          ...seatObj,
          uid, // refresh UID in case anonymous session rotated on the same device
          deviceId: seatObj.deviceId ?? deviceId,
          name: cleanName || seatObj.name,
          online: true,
          disconnectedAt: null,
          botTakeover: false,
        };
        if (wasHost) {
          room.hostUid = uid;
        }
      }
      assignedSeat = existingSeat;
      room.updatedAt = Date.now();
      return room;
    }

    // 2. Strangers cannot join a match already in progress or hijack a disconnected player's seat
    if (room.status !== "lobby") {
      assignedSeat = null;
      return room;
    }

    // 3. Take next open seat in lobby
    for (const s of [0, 1, 2, 3] as SeatIndex[]) {
      if (!room.seats[String(s)]) {
        room.seats[String(s)] = {
          uid,
          name: cleanName,
          isBot: false,
          online: true,
          joinedAt: Date.now(),
          deviceId,
          disconnectedAt: null,
          botTakeover: false,
        };
        assignedSeat = s;
        room.updatedAt = Date.now();
        return room;
      }
    }

    assignedSeat = null;
    return room;
  });

  return { seated: assignedSeat !== null, seat: assignedSeat };
}

/**
 * Click an empty seat in lobby to swap teams / partner position.
 */
export async function switchSeat(
  code: string,
  uid: string,
  playerName: string,
  targetSeat: SeatIndex,
  deviceId: string
): Promise<void> {
  const db = getFirebaseDb();
  const cleanName = playerName.trim().slice(0, 20) || "Player";

  await runTransaction(ref(db, `rooms/${code}`), (current) => {
    const room = normalizeRoomData(current as RoomData | null);
    if (!room || room.status !== "lobby") return current;

    const targetKey = String(targetSeat);
    if (room.seats[targetKey]) return current;

    const currentSeat = findPlayerSeat(room, uid, deviceId);
    if (currentSeat !== null) {
      room.seats[String(currentSeat)] = null;
    }

    room.seats[targetKey] = {
      uid,
      name: cleanName,
      isBot: false,
      online: true,
      joinedAt: Date.now(),
      deviceId,
      disconnectedAt: null,
      botTakeover: false,
    };
    room.updatedAt = Date.now();
    return room;
  });
}

/**
 * Deletes a room completely from Firebase Realtime Database to prevent database bloat.
 */
export async function deleteRoom(code: string): Promise<void> {
  const db = getFirebaseDb();
  await remove(ref(db, `rooms/${code}`));
}

/**
 * Leaves a room. If no human players remain in a lobby or finished match,
 * automatically deletes the room from Firebase Realtime Database!
 */
export async function leaveLobbySeat(
  code: string,
  uid: string,
  deviceId?: string | null
): Promise<void> {
  const db = getFirebaseDb();
  let shouldDelete = false;

  await runTransaction(ref(db, `rooms/${code}`), (current) => {
    const room = normalizeRoomData(current as RoomData | null);
    if (!room) return current;

    const seat = findPlayerSeat(room, uid, deviceId);
    if (seat !== null) {
      if (room.status === "lobby" || room.status === "finished") {
        room.seats[String(seat)] = null;
        if (room.hostUid === uid) {
          const nextHuman = ([0, 1, 2, 3] as SeatIndex[])
            .map((s) => room.seats[String(s)])
            .find((p) => p && !p.isBot);
          if (nextHuman) {
            room.hostUid = nextHuman.uid;
          }
        }
      } else {
        // Mid-game: mark offline with timestamp so 15s bot takeover starts & original player can return
        const existing = room.seats[String(seat)];
        if (existing) {
          room.seats[String(seat)] = {
            ...existing,
            online: false,
            disconnectedAt: Date.now(),
          };
        }
      }
    }

    const remainingHumans = ([0, 1, 2, 3] as SeatIndex[])
      .map((s) => room.seats[String(s)])
      .filter((p) => p && !p.isBot);

    const anyOnlineHuman = remainingHumans.some((p) => p?.online);

    if (
      (room.status === "lobby" || room.status === "finished") &&
      remainingHumans.length === 0
    ) {
      shouldDelete = true;
      return null; // Deletes room node atomically!
    }

    if (room.status === "finished" && !anyOnlineHuman) {
      shouldDelete = true;
      return null;
    }

    room.updatedAt = Date.now();
    return room;
  });

  if (shouldDelete) {
    await deleteRoom(code).catch(() => {});
  }
}

/**
 * Firebase onDisconnect presence tracking with serverTimestamp() for accurate 15s offline countdowns.
 */
export function attachPresence(code: string, seat: SeatIndex): () => void {
  const db = getFirebaseDb();
  const connectedRef = ref(db, ".info/connected");
  const seatRef = ref(db, `rooms/${code}/seats/${seat}`);

  const unsub = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      onDisconnect(seatRef)
        .update({
          online: false,
          disconnectedAt: serverTimestamp(),
        })
        .catch(() => {});

      update(seatRef, {
        online: true,
        disconnectedAt: null,
        botTakeover: false,
      }).catch(() => {});
    }
  });

  return () => {
    unsub();
  };
}

/**
 * Called by orchestrator once an offline human seat exceeds the 15-second grace period.
 * Activates AI bot takeover while keeping deviceId/uid intact for exclusive reclaim!
 */
export async function activateBotTakeover(
  code: string,
  seat: SeatIndex
): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}/seats/${seat}`), (current) => {
    const player = current as SeatPlayer | null;
    if (!player || player.isBot || player.online || player.botTakeover) {
      return current;
    }
    return {
      ...player,
      botTakeover: true,
    };
  });
}

export async function addBotToSeat(
  code: string,
  seat: SeatIndex
): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}`), (current) => {
    const room = normalizeRoomData(current as RoomData | null);
    if (!room || room.status !== "lobby") return current;
    if (room.seats[String(seat)]) return current;

    const usedNames = new Set(
      Object.values(room.seats)
        .filter(Boolean)
        .map((p) => p!.name)
    );
    const botBase =
      BOT_NAMES.find((n) => !usedNames.has(n)) ?? `Bot ${seat + 1}`;

    room.seats[String(seat)] = {
      uid: `bot_${seat}_${Date.now()}`,
      name: botBase,
      isBot: true,
      online: true,
      joinedAt: Date.now(),
      deviceId: null,
      disconnectedAt: null,
      botTakeover: false,
    };
    room.updatedAt = Date.now();
    return room;
  });
}

export async function removeBotFromSeat(
  code: string,
  seat: SeatIndex
): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}`), (current) => {
    const room = normalizeRoomData(current as RoomData | null);
    if (!room || room.status !== "lobby") return current;
    const player = room.seats[String(seat)];
    if (!player || !player.isBot) return current;
    room.seats[String(seat)] = null;
    room.updatedAt = Date.now();
    return room;
  });
}

export async function fillEmptySeatsWithBots(code: string): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}`), (current) => {
    const room = normalizeRoomData(current as RoomData | null);
    if (!room || room.status !== "lobby") return current;

    const usedNames = new Set(
      Object.values(room.seats)
        .filter(Boolean)
        .map((p) => p!.name)
    );

    for (const s of [0, 1, 2, 3] as SeatIndex[]) {
      if (!room.seats[String(s)]) {
        const botBase =
          BOT_NAMES.find((n) => !usedNames.has(n)) ?? `Bot ${s + 1}`;
        usedNames.add(botBase);
        room.seats[String(s)] = {
          uid: `bot_${s}_${Date.now()}_${s}`,
          name: botBase,
          isBot: true,
          online: true,
          joinedAt: Date.now(),
          deviceId: null,
          disconnectedAt: null,
          botTakeover: false,
        };
      }
    }
    room.updatedAt = Date.now();
    return room;
  });
}

export async function updateRoomSettings(
  code: string,
  partial: Partial<RoomSettings>
): Promise<void> {
  const db = getFirebaseDb();
  await update(ref(db, `rooms/${code}/settings`), partial);
}

export async function startMatch(code: string): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}`), (current) => {
    const room = normalizeRoomData(current as RoomData | null);
    if (!room) return current;
    const allFilled = ([0, 1, 2, 3] as SeatIndex[]).every(
      (s) => room.seats[String(s)] !== null
    );
    if (!allFilled) return current;

    const initialDealer: SeatIndex = 3;
    room.status = "playing";
    room.finishedAt = null;
    room.game = createHandState({
      handNumber: 1,
      dealerSeat: initialDealer,
      scores: { A: 0, B: 0 },
      carryOverBonus: 0,
      actionSeq: 0,
      now: Date.now(),
    });
    room.updatedAt = Date.now();
    return room;
  });
}

export async function submitTrumpChoice(
  code: string,
  seat: SeatIndex,
  suit: Suit
): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}/game`), (current) => {
    const game = normalizeGameState(current as GameState | null);
    if (!game || game.phase !== "SELECT_TRUMP" || game.trumpCaller !== seat) {
      return current;
    }
    return applyTrumpSelection(game, seat, suit, Date.now());
  });
}

export async function submitBlindTrumpCard(
  code: string,
  seat: SeatIndex,
  position: BlindCardPosition
): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}/game`), (current) => {
    const game = normalizeGameState(current as GameState | null);
    if (!game || game.phase !== "SELECT_TRUMP" || game.trumpCaller !== seat) {
      return current;
    }
    try {
      return applyBlindTrumpCardSelection(game, seat, position, Date.now());
    } catch {
      return current;
    }
  });
}

export async function commitBlindTrumpDeal(
  code: string,
  expectedActionSeq: number
): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}/game`), (current) => {
    const game = normalizeGameState(current as GameState | null);
    if (
      !game ||
      game.phase !== "REVEAL_TRUMP_CARD" ||
      game.actionSeq !== expectedActionSeq
    ) {
      return current;
    }
    return finalizeBlindTrumpDeal(game, Date.now());
  });
}

export async function submitCardPlay(
  code: string,
  seat: SeatIndex,
  cardId: string
): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}`), (current) => {
    const room = normalizeRoomData(current as RoomData | null);
    if (
      !room ||
      !room.game ||
      room.game.phase !== "PLAYING" ||
      room.game.currentTurn !== seat
    ) {
      return current;
    }
    try {
      const nextGame = applyCardPlay(room.game, seat, cardId, Date.now());
      room.game = nextGame;
      if (nextGame.phase === "GAME_OVER") {
        room.status = "finished";
        room.finishedAt = Date.now();
      }
      room.updatedAt = Date.now();
      return room;
    } catch {
      return current;
    }
  });
}

export async function commitTrickAdvance(
  code: string,
  expectedActionSeq: number
): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}`), (current) => {
    const room = normalizeRoomData(current as RoomData | null);
    if (!room || !room.game) return current;
    if (
      room.game.phase !== "TRICK_COMPLETE" ||
      room.game.actionSeq !== expectedActionSeq
    ) {
      return current;
    }
    const nextGame = advanceAfterTrick(room.game, Date.now());
    room.game = nextGame;
    if (nextGame.phase === "GAME_OVER") {
      room.status = "finished";
      room.finishedAt = Date.now();
    }
    room.updatedAt = Date.now();
    return room;
  });
}

export async function dealNextHand(code: string): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}/game`), (current) => {
    const game = normalizeGameState(current as GameState | null);
    if (!game || game.phase !== "HAND_SUMMARY") return current;
    return startNextHand(game, Date.now());
  });
}

export async function returnRoomToLobby(code: string): Promise<void> {
  const db = getFirebaseDb();
  await runTransaction(ref(db, `rooms/${code}`), (current) => {
    const room = normalizeRoomData(current as RoomData | null);
    if (!room) return current;
    room.status = "lobby";
    room.finishedAt = null;
    room.game = null;
    room.updatedAt = Date.now();
    return room;
  });
}

export async function sendTableEmote(
  code: string,
  seat: SeatIndex,
  emoteKey: EmoteKey
): Promise<void> {
  const db = getFirebaseDb();
  const now = Date.now();
  const emote: EmoteEvent = {
    id: `${seat}_${now}`,
    seat,
    emoteKey,
    timestamp: now,
  };
  await set(ref(db, `rooms/${code}/emotes/${seat}`), emote);
}
