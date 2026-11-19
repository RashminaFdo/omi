"use client";

import React from "react";
import { useSettings } from "@/lib/settings";

export function TableBackdrop({
  children,
  lockViewport = false,
}: {
  children: React.ReactNode;
  lockViewport?: boolean;
}) {
  const { prefs } = useSettings();

  const themeClass =
    prefs.feltTheme === "navy"
      ? "felt-navy"
      : prefs.feltTheme === "slate"
      ? "felt-slate"
      : "felt-emerald";

  return (
    <div
      className={`relative flex flex-col text-white overflow-x-hidden ${
        lockViewport ? "h-dvh overflow-hidden" : "min-h-dvh"
      } ${themeClass}`}
    >
      {/* Subtle woven casino felt dot texture */}
      <div className="pointer-events-none fixed inset-0 felt-texture opacity-45" />
      {/* Subtle radial table spotlight */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.06)_0%,transparent_58%,rgba(0,0,0,0.55)_100%)]" />
      {children}
    </div>
  );
}
