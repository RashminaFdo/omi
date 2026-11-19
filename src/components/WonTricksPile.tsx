"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { soundEngine } from "@/lib/sound";
import type { Card, Suit } from "@/lib/types";
import { CardBack, PlayingCard } from "./PlayingCard";

interface WonTricksPileProps {
  tricks: Card[][];
  trumpSuit: Suit | null;
  /** Where the seat sits visually on screen so the peek popover never clips off-screen */
  placement: "bottom" | "top" | "left" | "right";
}

export const WonTricksPile = React.memo(function WonTricksPile({
  tricks,
  trumpSuit,
  placement,
}: WonTricksPileProps) {
  const { prefs, dict } = useSettings();
  const [peeking, setPeeking] = useState(false);

  if (!tricks || tricks.length === 0) return null;

  const openPeek = () => {
    if (!peeking) {
      soundEngine.playCardFlip();
      setPeeking(true);
    }
  };

  const closePeek = () => {
    if (peeking) {
      soundEngine.playCardFlip();
      setPeeking(false);
    }
  };

  // Smart positioning for the revealed won-cards popover on both mobile & desktop
  const popoverPosition =
    placement === "bottom"
      ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
      : placement === "top"
      ? "top-full mt-2 left-1/2 -translate-x-1/2"
      : placement === "left"
      ? "left-full ml-2 top-1/2 -translate-y-1/2"
      : "right-full mr-2 top-1/2 -translate-y-1/2";

  const visibleStacks = Math.min(tricks.length, 4);

  return (
    <div
      className="relative inline-flex items-center touch-none select-none z-25"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") openPeek();
      }}
      onPointerLeave={() => closePeek()}
      onPointerDown={(e) => {
        e.preventDefault();
        openPeek();
      }}
      onPointerUp={() => closePeek()}
      onPointerCancel={() => closePeek()}
      onContextMenu={(e) => e.preventDefault()}
      title={dict.peekHint}
    >
      {/* Face-Down Stacked Trick Pile */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        className="relative flex items-center cursor-pointer group"
      >
        <div className="relative w-8 h-10 sm:w-9 sm:h-11">
          {Array.from({ length: visibleStacks }).map((_, idx) => (
            <div
              key={idx}
              style={{
                transform: `translate(${idx * 2}px, ${-idx * 1.5}px) rotate(${
                  (idx - 1) * 4
                }deg)`,
              }}
              className="absolute inset-0 transition-transform"
            >
              <CardBack
                design={prefs.cardBack}
                size="xs"
                className="ring-1 ring-amber-400/50 shadow-md"
              />
            </div>
          ))}
        </div>

        {/* Trick Count Badge */}
        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 border border-amber-400/55 px-1.5 py-0.5 text-[10px] font-black text-amber-200 shadow-sm group-hover:bg-amber-400 group-hover:text-slate-950 transition">
          <Eye className="w-2.5 h-2.5" />
          <span>{tricks.length}</span>
        </span>
      </motion.div>

      {/* Flipped Face-Up Cards Popover (ONLY visible while hovered / finger held down!) */}
      <AnimatePresence>
        {peeking ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: placement === "bottom" ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.16 }}
            className={`absolute ${popoverPosition} z-50 pointer-events-none rounded-2xl border border-amber-400/55 bg-[#07120e]/96 backdrop-blur-md p-2.5 shadow-2xl max-w-[82vw] sm:max-w-[340px]`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
              <span>{dict.wonCardsLabel(tricks.length)}</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[45vh] overflow-hidden">
              {tricks.map((trickCards, tIdx) => (
                <div
                  key={tIdx}
                  className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/10"
                >
                  <span className="text-[9px] font-black text-white/45 w-3.5 text-center shrink-0">
                    #{tIdx + 1}
                  </span>
                  <div className="flex items-center -space-x-2 sm:-space-x-1.5">
                    {trickCards.map((card, cIdx) => (
                      <motion.div
                        key={card.id}
                        initial={{ rotateY: 90, opacity: 0.4 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: 90, opacity: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: cIdx * 0.035,
                        }}
                        style={{ perspective: 600 }}
                      >
                        <PlayingCard
                          card={card}
                          size="xs"
                          isTrump={card.suit === trumpSuit}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
