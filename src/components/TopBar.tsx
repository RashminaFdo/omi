"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, LogOut, Settings } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { soundEngine } from "@/lib/sound";

interface TopBarProps {
  roomCode?: string;
  onLeave?: () => void;
}

export function TopBar({ roomCode, onLeave }: TopBarProps) {
  const { prefs, dict, toggleLanguage, setSettingsOpen, setRulesOpen } =
    useSettings();

  return (
    <header className="relative z-30 flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 border-b border-white/10 bg-black/35 backdrop-blur-md">
      {/* Left: Brand */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-2 group shrink-0"
          onClick={() => soundEngine.playClick()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/omi-logo.png"
            alt="Omi Logo"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-[0_2px_8px_rgba(251,191,36,0.35)] group-hover:scale-105 transition-transform"
          />
          <div className="leading-tight hidden sm:block">
            <span className="font-extrabold tracking-tight text-base text-amber-200">
              {dict.appName}
            </span>
            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">
              {prefs.language === "en" ? "ඕමි" : "OMI"}
            </span>
          </div>
        </Link>

        {roomCode ? (
          <div className="flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-amber-400/30 px-2.5 py-1 text-xs">
            <span className="text-white/55 hidden xs:inline">
              {dict.roomCode}:
            </span>
            <span className="font-mono font-extrabold tracking-widest text-amber-300">
              {roomCode}
            </span>
          </div>
        ) : null}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Instant Language Switcher */}
        <button
          type="button"
          onClick={() => {
            toggleLanguage();
            soundEngine.playClick();
          }}
          className="rounded-full border border-amber-400/35 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-200 transition"
          title="Switch English / සිංහල"
        >
          {prefs.language === "en" ? "සිංහල" : "EN"}
        </button>

        {/* How to Play */}
        <button
          type="button"
          onClick={() => {
            setRulesOpen(true);
            soundEngine.playClick();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/15 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white/90 transition"
          title={dict.howToPlay}
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden md:inline">{dict.howToPlay}</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(true);
            soundEngine.playClick();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/15 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white/90 transition"
          title={dict.settings}
        >
          <Settings className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden md:inline">{dict.settings}</span>
        </button>

        {onLeave ? (
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onLeave();
            }}
            className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/15 hover:bg-rose-500/25 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-rose-200 transition"
            title={dict.leaveRoom}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{dict.leaveRoom}</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
