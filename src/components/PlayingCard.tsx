"use client";

import React from "react";
import { motion } from "framer-motion";
import { isRedSuit, SUIT_SYMBOL } from "@/lib/i18n";
import type { Card, CardBackDesign, Suit } from "@/lib/types";

interface PlayingCardProps {
  card: Card;
  size?: "xs" | "sm" | "md" | "lg";
  isTrump?: boolean;
  isLegal?: boolean;
  isInteractive?: boolean;
  isWinning?: boolean;
  isCut?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<PlayingCardProps["size"]>, string> = {
  xs: "w-10 h-14 sm:w-11 sm:h-16 rounded-md",
  sm: "w-12 h-[70px] sm:w-16 sm:h-24 rounded-lg",
  md: "w-[62px] h-[90px] sm:w-[82px] sm:h-[118px] rounded-xl",
  lg: "w-[64px] h-[94px] sm:w-[88px] sm:h-[126px] rounded-xl",
};

function SuitIcon({
  suit,
  className = "w-4 h-4",
}: {
  suit: Suit;
  className?: string;
}) {
  switch (suit) {
    case "S":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2C9 6.5 4 10.2 4 14.2C4 16.9 6.1 19 8.7 19C10.1 19 11.2 18.3 11.8 17.4C11.6 19.3 10.8 20.8 9.2 22H14.8C13.2 20.8 12.4 19.3 12.2 17.4C12.8 18.3 13.9 19 15.3 19C17.9 19 20 16.9 20 14.2C20 10.2 15 6.5 12 2Z" />
        </svg>
      );
    case "H":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" />
        </svg>
      );
    case "D":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2L20.5 12L12 22L3.5 12L12 2Z" />
        </svg>
      );
    case "C":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2.5C9.8 2.5 8 4.3 8 6.5C8 7.6 8.4 8.6 9.1 9.3C8.5 9.1 7.8 9 7.1 9C4.8 9 3 10.8 3 13.1C3 15.4 4.8 17.2 7.1 17.2C8.8 17.2 10.3 16.2 10.9 14.7C10.9 17.2 10.2 19.6 8.6 21.5H15.4C13.8 19.6 13.1 17.2 13.1 14.7C13.7 16.2 15.2 17.2 16.9 17.2C19.2 17.2 21 15.4 21 13.1C21 10.8 19.2 9 16.9 9C16.2 9 15.5 9.1 14.9 9.3C15.6 8.6 16 7.6 16 6.5C16 4.3 14.2 2.5 12 2.5Z" />
        </svg>
      );
  }
}

export { SuitIcon };

export const PlayingCard = React.memo(function PlayingCard({
  card,
  size = "md",
  isTrump = false,
  isLegal = true,
  isInteractive = false,
  isWinning = false,
  isCut = false,
  selected = false,
  onClick,
  className = "",
}: PlayingCardProps) {
  const red = isRedSuit(card.suit);
  const colorClass = red ? "text-[#c81e32]" : "text-[#171c28]";
  const isFace = card.rank === "K" || card.rank === "Q" || card.rank === "J";
  const isAce = card.rank === "A";

  const disabledState = isInteractive && !isLegal;

  return (
    <motion.button
      type="button"
      disabled={!isInteractive || !isLegal}
      onClick={isInteractive && isLegal ? onClick : undefined}
      whileHover={isInteractive && isLegal ? { y: -14, scale: 1.05 } : undefined}
      whileTap={isInteractive && isLegal ? { scale: 0.97 } : undefined}
      className={`relative select-none text-left transition-shadow duration-200 ${SIZE_CLASSES[size]} ${
        disabledState
          ? "opacity-45 brightness-75 saturate-50 cursor-not-allowed"
          : isInteractive
          ? "cursor-pointer hover:shadow-[0_14px_30px_rgba(245,197,66,0.32)]"
          : "cursor-default"
      } ${
        isWinning
          ? "ring-2 ring-amber-400 shadow-[0_0_26px_rgba(251,191,36,0.65)]"
          : isCut
          ? "ring-2 ring-rose-400 shadow-[0_0_22px_rgba(251,113,133,0.5)]"
          : selected
          ? "ring-2 ring-emerald-400 -translate-y-3"
          : isInteractive && isLegal
          ? "ring-1 ring-amber-300/60 shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
          : "ring-1 ring-black/15 shadow-[0_6px_16px_rgba(0,0,0,0.38)]"
      } bg-gradient-to-br from-[#ffffff] via-[#fdfbf5] to-[#efeae0] overflow-hidden ${className}`}
      aria-label={`${card.rank} ${SUIT_SYMBOL[card.suit]}`}
    >
      {/* Subtle Trump gold shimmer border inside card */}
      {isTrump ? (
        <span className="pointer-events-none absolute inset-[2px] rounded-[9px] border border-amber-400/55 bg-gradient-to-br from-amber-200/15 via-transparent to-amber-300/10" />
      ) : null}

      {/* Top-Left Corner */}
      <div
        className={`absolute top-1 left-1.5 sm:top-1.5 sm:left-2 flex flex-col items-center leading-none ${colorClass}`}
      >
        <span
          className={`font-extrabold tracking-tight ${
            size === "xs"
              ? "text-[11px]"
              : size === "sm"
              ? "text-xs sm:text-sm"
              : "text-sm sm:text-base"
          }`}
        >
          {card.rank}
        </span>
        <SuitIcon
          suit={card.suit}
          className={
            size === "xs"
              ? "w-2.5 h-2.5 mt-0.5"
              : size === "sm"
              ? "w-3 h-3 mt-0.5"
              : "w-3.5 h-3.5 mt-0.5"
          }
        />
      </div>

      {/* Center Emblem */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none ${colorClass}`}
      >
        {isAce ? (
          <div className="relative flex items-center justify-center">
            <SuitIcon
              suit={card.suit}
              className={
                size === "xs"
                  ? "w-5 h-5"
                  : size === "sm"
                  ? "w-7 h-7"
                  : "w-10 h-10 sm:w-11 sm:h-11 drop-shadow-sm"
              }
            />
          </div>
        ) : isFace ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-2 py-1">
            <span
              className={`font-serif font-black leading-none ${
                size === "xs"
                  ? "text-sm"
                  : size === "sm"
                  ? "text-lg"
                  : "text-2xl sm:text-3xl"
              }`}
            >
              {card.rank}
            </span>
            <SuitIcon
              suit={card.suit}
              className={
                size === "xs"
                  ? "w-3 h-3 mt-0.5 opacity-80"
                  : "w-4 h-4 mt-0.5 opacity-80"
              }
            />
          </div>
        ) : (
          <SuitIcon
            suit={card.suit}
            className={
              size === "xs"
                ? "w-4 h-4 opacity-85"
                : size === "sm"
                ? "w-6 h-6 opacity-85"
                : "w-8 h-8 sm:w-9 sm:h-9 opacity-85"
            }
          />
        )}
      </div>

      {/* Bottom-Right Corner (Inverted) */}
      {size !== "xs" ? (
        <div
          className={`absolute bottom-1 right-1.5 sm:bottom-1.5 sm:right-2 flex flex-col items-center leading-none rotate-180 ${colorClass}`}
        >
          <span
            className={`font-extrabold tracking-tight ${
              size === "sm" ? "text-xs sm:text-sm" : "text-sm sm:text-base"
            }`}
          >
            {card.rank}
          </span>
          <SuitIcon
            suit={card.suit}
            className={size === "sm" ? "w-3 h-3 mt-0.5" : "w-3.5 h-3.5 mt-0.5"}
          />
        </div>
      ) : null}

      {/* Trump Mini Star Indicator */}
      {isTrump && size !== "xs" ? (
        <span
          title="Trump"
          className="pointer-events-none absolute top-1 right-1.5 text-[10px] font-bold text-amber-500 drop-shadow-sm"
        >
          ★
        </span>
      ) : null}
    </motion.button>
  );
});

export const CardBack = React.memo(function CardBack({
  design = "crimson",
  size = "sm",
  className = "",
}: {
  design?: CardBackDesign;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const palette =
    design === "gold"
      ? "from-[#2c2210] via-[#4a3514] to-[#1f1709] border-amber-400/70"
      : design === "sapphire"
      ? "from-[#0f2557] via-[#1b3c87] to-[#0a193b] border-sky-300/60"
      : "from-[#6f1224] via-[#9c1c34] to-[#4f0c18] border-amber-300/65";

  const accent =
    design === "gold"
      ? "text-amber-300"
      : design === "sapphire"
      ? "text-sky-200"
      : "text-amber-200";

  const sizeCls =
    size === "xs"
      ? "w-7 h-10 rounded"
      : size === "sm"
      ? "w-10 h-14 sm:w-12 sm:h-[68px] rounded-lg"
      : "w-14 h-20 rounded-xl";

  return (
    <div
      className={`relative select-none bg-gradient-to-br ${palette} border p-[3px] shadow-md overflow-hidden ${sizeCls} ${className}`}
    >
      <div className="w-full h-full rounded-[4px] border border-white/25 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[length:6px_6px] flex items-center justify-center">
        <span className={`font-serif font-bold text-[10px] sm:text-xs ${accent} opacity-90`}>
          ♦
        </span>
      </div>
    </div>
  );
});
