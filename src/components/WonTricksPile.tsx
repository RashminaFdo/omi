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
  const popoverId = React.useId();

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

  // Keep the pile sheet centered on mobile and anchor it beside the seat on wider screens.
  const popoverPosition =
    placement === "bottom"
      ? "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:absolute sm:top-auto sm:translate-y-0 sm:bottom-full sm:mb-2 sm:left-1/2 sm:-translate-x-1/2"
      : placement === "top"
      ? "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:absolute sm:bottom-auto sm:translate-y-0 sm:top-full sm:mt-2 sm:left-1/2 sm:-translate-x-1/2"
      : placement === "left"
      ? "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:absolute sm:left-full sm:ml-2 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0"
      : "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:absolute sm:left-auto sm:right-full sm:mr-2 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0";

  const visibleStacks = Math.min(tricks.length, 4);

  return (
    <div className="relative inline-flex items-center select-none z-25">
      <button
        type="button"
        onClick={() => (peeking ? closePeek() : openPeek())}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closePeek();
          }
        }}
        aria-label={`${dict.peekHint} (${tricks.length})`}
        aria-expanded={peeking}
        aria-controls={popoverId}
        title={dict.peekHint}
        className="relative inline-flex min-h-11 min-w-11 items-center rounded-lg bg-transparent p-0 text-left touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08120f]"
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
      </button>

      <AnimatePresence>
        {peeking ? (
          <>
            <button
              type="button"
              aria-label={dict.close}
              tabIndex={-1}
              onClick={closePeek}
              className="fixed inset-0 z-40 cursor-default bg-black/20 sm:bg-transparent"
            />
            <motion.div
              id={popoverId}
              role="region"
              aria-label={dict.wonCardsLabel(tricks.length)}
              initial={{ opacity: 0, scale: 0.9, y: placement === "bottom" ? 6 : -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.16 }}
              className={`absolute ${popoverPosition} z-50 rounded-2xl border border-amber-400/55 bg-[#07120e]/96 backdrop-blur-md p-2.5 shadow-2xl max-w-[82vw] sm:max-w-[340px]`}
            >
            <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
              <span>{dict.wonCardsLabel(tricks.length)}</span>
            </div>

              <div className="flex flex-col gap-2 max-h-[50dvh] sm:max-h-[45vh] overflow-y-auto overscroll-contain pr-1">
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
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
