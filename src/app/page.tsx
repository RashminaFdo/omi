"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  KeyRound,
  PlusCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { TableBackdrop } from "@/components/TableBackdrop";
import { TopBar } from "@/components/TopBar";
import {
  checkRoomExists,
  createRoom,
  normalizeCode,
} from "@/lib/roomService";
import { useSettings } from "@/lib/settings";
import { soundEngine } from "@/lib/sound";

export default function HomePage() {
  const router = useRouter();
  const { prefs, dict, setNickname, setRulesOpen } = useSettings();

  const [draftName, setDraftName] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInput = draftName ?? prefs.nickname;

  const validateName = () => {
    const clean = nameInput.trim();
    if (!clean) {
      setError(
        prefs.language === "si"
          ? "කරුණාකර ඔබේ නම ඇතුළත් කරන්න."
          : "Please enter your nickname first."
      );
      return null;
    }
    setNickname(clean);
    return clean;
  };

  const handleCreateRoom = async () => {
    setError(null);
    const cleanName = validateName();
    if (!cleanName || creating) return;

    setCreating(true);
    try {
      soundEngine.playClick();
      const code = await createRoom(cleanName);
      router.push(`/room/${code}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create room. Try again."
      );
      setCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = validateName();
    if (!cleanName || joining) return;

    const cleanCode = normalizeCode(joinCode);
    if (cleanCode.length !== 6) {
      setError(dict.roomNotFound);
      return;
    }

    setJoining(true);
    try {
      soundEngine.playClick();
      const exists = await checkRoomExists(cleanCode);
      if (!exists) {
        setError(dict.roomNotFound);
        setJoining(false);
        return;
      }
      router.push(`/room/${cleanCode}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not connect to room."
      );
      setJoining(false);
    }
  };

  return (
    <TableBackdrop>
      <TopBar />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl space-y-6">
          {/* Hero Logo & Title */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-3"
          >
            <div className="relative mx-auto w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
              <div className="absolute inset-2 rounded-full bg-amber-400/20 blur-2xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/omi-logo.png"
                alt="Omi — The Sri Lankan Card Game"
                className="relative w-full h-full object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.6)]"
              />
            </div>

            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
                {prefs.language === "si" ? "ඕමි • OMI" : "OMI • ඕමි"}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-white/75 font-medium">
                {dict.tagline}
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-semibold text-amber-200/90">
              <span className="rounded-full bg-white/[0.06] border border-white/10 px-3 py-1">
                ♠ ♥ ♦ ♣ 32 Cards
              </span>
              <span className="rounded-full bg-white/[0.06] border border-white/10 px-3 py-1">
                4-Player Live
              </span>
              <span className="rounded-full bg-white/[0.06] border border-white/10 px-3 py-1">
                EN / සිංහල
              </span>
              <span className="rounded-full bg-white/[0.06] border border-white/10 px-3 py-1">
                Smart AI Bots
              </span>
            </div>
          </motion.div>

          {/* Main Card: Nickname + Create / Join */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="glass-panel rounded-3xl border border-white/15 p-5 sm:p-7 shadow-2xl space-y-6"
          >
            {/* Nickname Field */}
            <div>
              <label
                htmlFor="nickname"
                className="block text-xs font-bold uppercase tracking-wider text-amber-200/90 mb-2"
              >
                {dict.nicknameLabel}
              </label>
              <input
                id="nickname"
                type="text"
                maxLength={20}
                value={nameInput}
                onChange={(e) => {
                  setDraftName(e.target.value);
                  setError(null);
                }}
                placeholder={dict.nicknamePlaceholder}
                className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3.5 text-base font-semibold text-white placeholder:text-white/35 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25 transition"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-rose-200">
                {error}
              </div>
            ) : null}

            {/* Two-Column Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Create Room Card */}
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    {dict.createRoom}
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {prefs.language === "si"
                      ? "නව ඕමි මේසයක් අරඹා ආරාධනා සබැඳිය හෝ අක්ෂර 6 කේතය මිතුරන්ට යවන්න."
                      : "Host a private table, share an invite link or 6-letter code, and optionally fill seats with AI bots."}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={creating || joining}
                  onClick={handleCreateRoom}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-110 disabled:opacity-50 py-3 px-4 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  {creating ? dict.creating : dict.createRoom}
                </button>
              </div>

              {/* Join Room Card */}
              <form
                onSubmit={handleJoinRoom}
                className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                    <KeyRound className="w-3.5 h-3.5" />
                    {dict.joinRoom}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(normalizeCode(e.target.value));
                      setError(null);
                    }}
                    placeholder={dict.roomCodePlaceholder}
                    className="w-full rounded-xl border border-white/15 bg-black/45 px-3.5 py-2.5 text-center font-mono text-lg font-black tracking-[0.25em] text-amber-200 placeholder:text-white/25 placeholder:tracking-widest focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 transition uppercase"
                  />
                </div>

                <button
                  type="submit"
                  disabled={joining || creating || joinCode.length < 6}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 py-3 px-4 text-sm font-bold text-emerald-100 transition"
                >
                  {joining ? dict.joining : dict.enterTable}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Footer Quick Help */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-300/80" />
                {dict.footerNote}
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setRulesOpen(true);
                }}
                className="inline-flex items-center gap-1 font-bold text-amber-300 hover:text-amber-200 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {dict.howToPlay}
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </TableBackdrop>
  );
}
