"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { getDict, type I18nDict } from "./i18n";
import { soundEngine } from "./sound";
import type {
  AnimationSpeed,
  CardBackDesign,
  FeltTheme,
  Language,
  UserPreferences,
} from "./types";

const STORAGE_KEY = "omi_user_prefs_v1";

const DEFAULT_PREFS: UserPreferences = {
  language: "en",
  soundEnabled: true,
  volume: 0.7,
  animationSpeed: "normal",
  feltTheme: "emerald",
  cardBack: "crimson",
  nickname: "",
};

// Module-level cached external store for localStorage (React 19 safe, zero effect setState)
let cachedRaw: string | null = null;
let cachedPrefs: UserPreferences = DEFAULT_PREFS;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribePrefs(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) emitChange();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getPrefsSnapshot(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedPrefs;
    cachedRaw = raw;
    if (!raw) {
      cachedPrefs = DEFAULT_PREFS;
      return cachedPrefs;
    }
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    cachedPrefs = { ...DEFAULT_PREFS, ...parsed };
    return cachedPrefs;
  } catch {
    return DEFAULT_PREFS;
  }
}

function getServerSnapshot(): UserPreferences {
  return DEFAULT_PREFS;
}

function writePrefs(updater: (prev: UserPreferences) => UserPreferences) {
  const next = updater(getPrefsSnapshot());
  const raw = JSON.stringify(next);
  cachedRaw = raw;
  cachedPrefs = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      // ignore storage quota errors
    }
  }
  emitChange();
}

const emptySubscribe = () => () => {};

interface SettingsContextValue {
  prefs: UserPreferences;
  dict: I18nDict;
  hydrated: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setVolume: (vol: number) => void;
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  setFeltTheme: (theme: FeltTheme) => void;
  setCardBack: (back: CardBackDesign) => void;
  setNickname: (name: string) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  rulesOpen: boolean;
  setRulesOpen: (open: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const prefs = useSyncExternalStore(
    subscribePrefs,
    getPrefsSnapshot,
    getServerSnapshot
  );
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  // Sync audio engine configuration whenever preferences change
  useEffect(() => {
    soundEngine.configure(prefs.soundEnabled, prefs.volume);
  }, [prefs.soundEnabled, prefs.volume]);

  const setLanguage = useCallback(
    (language: Language) => writePrefs((p) => ({ ...p, language })),
    []
  );
  const toggleLanguage = useCallback(
    () =>
      writePrefs((p) => ({
        ...p,
        language: p.language === "en" ? "si" : "en",
      })),
    []
  );
  const setSoundEnabled = useCallback(
    (soundEnabled: boolean) => writePrefs((p) => ({ ...p, soundEnabled })),
    []
  );
  const setVolume = useCallback(
    (volume: number) => writePrefs((p) => ({ ...p, volume })),
    []
  );
  const setAnimationSpeed = useCallback(
    (animationSpeed: AnimationSpeed) =>
      writePrefs((p) => ({ ...p, animationSpeed })),
    []
  );
  const setFeltTheme = useCallback(
    (feltTheme: FeltTheme) => writePrefs((p) => ({ ...p, feltTheme })),
    []
  );
  const setCardBack = useCallback(
    (cardBack: CardBackDesign) => writePrefs((p) => ({ ...p, cardBack })),
    []
  );
  const setNickname = useCallback(
    (nickname: string) => writePrefs((p) => ({ ...p, nickname })),
    []
  );

  const dict = useMemo(() => getDict(prefs.language), [prefs.language]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      prefs,
      dict,
      hydrated,
      setLanguage,
      toggleLanguage,
      setSoundEnabled,
      setVolume,
      setAnimationSpeed,
      setFeltTheme,
      setCardBack,
      setNickname,
      settingsOpen,
      setSettingsOpen,
      rulesOpen,
      setRulesOpen,
    }),
    [
      prefs,
      dict,
      hydrated,
      setLanguage,
      toggleLanguage,
      setSoundEnabled,
      setVolume,
      setAnimationSpeed,
      setFeltTheme,
      setCardBack,
      setNickname,
      settingsOpen,
      rulesOpen,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return ctx;
}
