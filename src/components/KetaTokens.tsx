"use client";

import React from "react";
import { motion } from "framer-motion";
import { TARGET_TOKENS } from "@/lib/omiEngine";
import { useSettings } from "@/lib/settings";
import type { TeamId } from "@/lib/types";

interface KetaTokensProps {
  scores: Record<TeamId, number>;
  carryOverBonus: number;
  myTeam: TeamId | null;
  compact?: boolean;
}

export const KetaTokens = React.memo(function KetaTokens({
  scores,
  carryOverBonus,
  myTeam,
  compact = false,
}: KetaTokensProps) {
  const { dict } = useSettings();
  const teamAScore = Math.min(TARGET_TOKENS, scores.A);
  const teamBScore = Math.min(TARGET_TOKENS, scores.B);

  return (
    <div
      className={`glass-panel rounded-2xl border border-white/10 ${
        compact ? "px-2.5 py-2" : "px-3.5 py-2.5"
      } shadow-xl`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-300/90">
          {dict.tokens}
        </span>
        {carryOverBonus > 0 ? (
          <motion.span
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 text-[10px] font-bold text-amber-200"
          >
            ⚖️ {dict.carryOverActive(carryOverBonus)}
          </motion.span>
        ) : (
          <span className="text-[10px] text-white/45 font-medium">
            20 • First to 10
          </span>
        )}
      </div>

      {/* Team A (10 Red Keta Tokens) */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-16 sm:w-20 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] shrink-0" />
            <span
              className={`text-[11px] font-semibold truncate ${
                myTeam === "A" ? "text-amber-200" : "text-white/85"
              }`}
            >
              {dict.teamA}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-1">
            {Array.from({ length: TARGET_TOKENS }).map((_, idx) => {
              const filled = idx < teamAScore;
              return (
                <motion.span
                  key={`a-${idx}`}
                  initial={false}
                  animate={filled ? { scale: [1.25, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`h-3.5 w-2.5 sm:h-4 sm:w-3 rounded-[3px] border transition-colors ${
                    filled
                      ? "bg-gradient-to-b from-rose-400 to-rose-600 border-rose-200/80 shadow-[0_0_8px_rgba(244,63,94,0.65)]"
                      : "bg-white/[0.06] border-white/15"
                  }`}
                />
              );
            })}
          </div>
          <span className="w-7 text-right text-xs font-extrabold text-rose-300 tabular-nums">
            {scores.A}
          </span>
        </div>

        {/* Team B (10 Black Keta Tokens) */}
        <div className="flex items-center gap-2">
          <div className="w-16 sm:w-20 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-200 ring-1 ring-slate-500 shrink-0" />
            <span
              className={`text-[11px] font-semibold truncate ${
                myTeam === "B" ? "text-amber-200" : "text-white/85"
              }`}
            >
              {dict.teamB}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-1">
            {Array.from({ length: TARGET_TOKENS }).map((_, idx) => {
              const filled = idx < teamBScore;
              return (
                <motion.span
                  key={`b-${idx}`}
                  initial={false}
                  animate={filled ? { scale: [1.25, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`h-3.5 w-2.5 sm:h-4 sm:w-3 rounded-[3px] border transition-colors ${
                    filled
                      ? "bg-gradient-to-b from-slate-600 via-slate-800 to-black border-amber-300/70 shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                      : "bg-white/[0.06] border-white/15"
                  }`}
                />
              );
            })}
          </div>
          <span className="w-7 text-right text-xs font-extrabold text-slate-200 tabular-nums">
            {scores.B}
          </span>
        </div>
      </div>
    </div>
  );
});
