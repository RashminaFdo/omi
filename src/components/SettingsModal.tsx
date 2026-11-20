"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, X, Zap, Globe, Palette, Layers } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { soundEngine } from "@/lib/sound";
import type { CardBackDesign, FeltTheme } from "@/lib/types";
import { CardBack } from "./PlayingCard";

export function SettingsModal() {
  const {
    prefs,
    dict,
    settingsOpen,
    setSettingsOpen,
    setLanguage,
    setSoundEnabled,
    setVolume,
    setAnimationSpeed,
    setFeltTheme,
    setCardBack,
  } = useSettings();

  const themes: { id: FeltTheme; label: string; swatch: string }[] = [
    {
      id: "emerald",
      label: dict.themeEmerald,
      swatch: "from-emerald-700 via-emerald-900 to-emerald-950",
    },
    {
      id: "navy",
      label: dict.themeNavy,
      swatch: "from-blue-800 via-indigo-950 to-slate-950",
    },
    {
      id: "slate",
      label: dict.themeSlate,
      swatch: "from-slate-700 via-slate-900 to-zinc-950",
    },
  ];

  const backs: { id: CardBackDesign; label: string }[] = [
    { id: "crimson", label: dict.cardBackCrimson },
    { id: "gold", label: dict.cardBackGold },
    { id: "sapphire", label: dict.cardBackSapphire },
  ];

  return (
    <AnimatePresence>
      {settingsOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          onClick={() => setSettingsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="w-full max-w-md max-h-[88dvh] sm:max-h-[86dvh] flex flex-col rounded-3xl border border-white/15 bg-[#0c1412]/98 text-white shadow-2xl overflow-hidden"
          >
            <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
              <h2 id="settings-title" className="text-lg sm:text-xl font-bold tracking-tight text-amber-200">
                {dict.settingsTitle}
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full p-2 text-white/75 hover:bg-white/10 hover:text-white transition"
                aria-label={dict.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-5">
              {/* Language Toggle */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/65 mb-2.5">
                  <Globe className="w-4 h-4 text-amber-400" />
                  {dict.languageLabel}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["en", "si"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLanguage(lang);
                        soundEngine.playClick();
                      }}
                      aria-pressed={prefs.language === lang}
                      className={`min-h-11 rounded-xl py-2.5 px-3 text-sm font-semibold border transition ${
                        prefs.language === lang
                          ? "bg-amber-400/20 border-amber-400 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.2)]"
                          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {lang === "en" ? "English" : "සිංහල (Sinhala)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Toggle & Master Volume */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {prefs.soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    )}
                    {dict.soundEffects}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !prefs.soundEnabled;
                      setSoundEnabled(next);
                      if (next) {
                        soundEngine.configure(true, prefs.volume);
                        soundEngine.playClick();
                      }
                    }}
                    role="switch"
                    aria-checked={prefs.soundEnabled}
                    aria-label={dict.soundEffects}
                    className="inline-flex min-h-11 min-w-14 items-center justify-center rounded-xl"
                  >
                    <span
                      className={`relative block h-6 w-12 rounded-full transition-colors ${
                        prefs.soundEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          prefs.soundEnabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/65 mb-1.5">
                    <span>{dict.masterVolume}</span>
                    <span className="tabular-nums font-semibold text-amber-200">
                      {Math.round(prefs.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(prefs.volume * 100)}
                    disabled={!prefs.soundEnabled}
                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                    onMouseUp={() => soundEngine.playCardSlap(false)}
                    onTouchEnd={() => soundEngine.playCardSlap(false)}
                    aria-label={dict.masterVolume}
                    className="h-11 w-full accent-amber-400 cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Animation Speed */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/65 mb-2.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  {dict.animationSpeed}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["normal", "fast"] as const).map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        setAnimationSpeed(spd);
                        soundEngine.playClick();
                      }}
                      aria-pressed={prefs.animationSpeed === spd}
                      className={`min-h-11 rounded-xl py-2.5 px-3 text-sm font-semibold border transition ${
                        prefs.animationSpeed === spd
                          ? "bg-amber-400/20 border-amber-400 text-amber-200"
                          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {spd === "normal" ? dict.speedNormal : dict.speedFast}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Felt Theme */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/65 mb-2.5">
                  <Palette className="w-4 h-4 text-amber-400" />
                  {dict.tableTheme}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setFeltTheme(t.id);
                        soundEngine.playClick();
                      }}
                      aria-pressed={prefs.feltTheme === t.id}
                      className={`min-h-11 flex flex-col items-center gap-2 rounded-2xl p-2.5 border transition ${
                        prefs.feltTheme === t.id
                          ? "border-amber-400 bg-amber-400/15"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08]"
                      }`}
                    >
                      <span
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.swatch} border-2 border-white/25 shadow-inner`}
                      />
                      <span className="text-[11px] font-medium text-center leading-tight">
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Back Design */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/65 mb-2.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  {dict.cardBackLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {backs.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setCardBack(b.id);
                        soundEngine.playClick();
                      }}
                      aria-pressed={prefs.cardBack === b.id}
                      className={`min-h-11 flex flex-col items-center gap-2 rounded-2xl p-2.5 border transition ${
                        prefs.cardBack === b.id
                          ? "border-amber-400 bg-amber-400/15"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08]"
                      }`}
                    >
                      <CardBack design={b.id} size="xs" />
                      <span className="text-[11px] font-medium text-center leading-tight">
                        {b.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#08100d] p-4">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="min-h-11 w-full rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300 transition"
              >
                {dict.close}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
