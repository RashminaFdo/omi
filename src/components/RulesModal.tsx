"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, X } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { SUIT_SYMBOL, isRedSuit } from "@/lib/i18n";
import type { Suit } from "@/lib/types";

export function RulesModal() {
  const { prefs, dict, rulesOpen, setRulesOpen, toggleLanguage } = useSettings();

  return (
    <AnimatePresence>
      {rulesOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setRulesOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#0c1412]/95 p-6 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/35 text-amber-300">
                  <BookOpen className="w-5 h-5" />
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-amber-200">
                  {dict.rulesTitle}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-amber-200 hover:bg-white/10 transition"
                >
                  {prefs.language === "en" ? "සිංහල" : "English"}
                </button>
                <button
                  type="button"
                  onClick={() => setRulesOpen(false)}
                  className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition"
                  aria-label={dict.close}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Suits & Face Cards Reference */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {(["S", "H", "D", "C"] as Suit[]).map((s) => (
                <div
                  key={s}
                  className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 flex items-center gap-2"
                >
                  <span
                    className={`text-xl ${
                      isRedSuit(s) ? "text-rose-400" : "text-slate-100"
                    }`}
                  >
                    {SUIT_SYMBOL[s]}
                  </span>
                  <div className="text-xs font-semibold text-white/90">
                    {dict.suits[s]}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-amber-500/[0.08] border border-amber-400/25 px-4 py-3 mb-5 text-xs sm:text-sm text-amber-100/90 flex flex-wrap gap-x-4 gap-y-1.5">
              <span>
                <strong>A</strong> = {dict.ranks.A}
              </span>
              <span>
                <strong>K</strong> = {dict.ranks.K}
              </span>
              <span>
                <strong>Q</strong> = {dict.ranks.Q}
              </span>
              <span>
                <strong>J</strong> = {dict.ranks.J}
              </span>
              <span className="text-white/60">• A &gt; K &gt; Q &gt; J &gt; 10 &gt; 9 &gt; 8 &gt; 7</span>
            </div>

            {/* Rules Sections */}
            <div className="space-y-4">
              {dict.rulesSections.map((sec, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white/[0.03] border border-white/10 p-4"
                >
                  <h3 className="text-sm sm:text-base font-bold text-amber-300 mb-2">
                    {i + 1}. {sec.title}
                  </h3>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-white/80 leading-relaxed list-disc pl-5">
                    {sec.points.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setRulesOpen(false)}
              className="mt-6 w-full rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300 transition"
            >
              {dict.close}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
