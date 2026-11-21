import type { MemeId } from "./types";

export interface MemeItem {
  id: MemeId;
  label: string;
  filename: string;
  url: string;
}

export const MEME_CATALOG: readonly MemeItem[] = [
  {
    id: "asiyath",
    label: "♠️ asiyath man gawa",
    filename: "♠️asiyath man gawa.mp4",
    url: `/memes/${encodeURIComponent("♠️asiyath man gawa.mp4")}`,
  },
  {
    id: "ado",
    label: "ado thota puluwan nam",
    filename: "ado thota puluwan nam.mp4",
    url: `/memes/${encodeURIComponent("ado thota puluwan nam.mp4")}`,
  },
  {
    id: "ammatahudu",
    label: "ammatahudu",
    filename: "ammatahudu.mp4",
    url: `/memes/${encodeURIComponent("ammatahudu.mp4")}`,
  },
  {
    id: "heyyy",
    label: "heyyy",
    filename: "heyyy.mp4",
    url: `/memes/${encodeURIComponent("heyyy.mp4")}`,
  },
  {
    id: "kanawa",
    label: "kanawa thowa",
    filename: "kanawa thowa.mp4",
    url: `/memes/${encodeURIComponent("kanawa thowa.mp4")}`,
  },
  {
    id: "kaputu",
    label: "kaputu sasthare",
    filename: "kaputu sasthare.mp4",
    url: `/memes/${encodeURIComponent("kaputu sasthare.mp4")}`,
  },
] as const;

export function getMemeById(id: MemeId): MemeItem | undefined {
  return MEME_CATALOG.find((m) => m.id === id);
}

// Module-level in-memory Blob ObjectURL cache for zero-latency playback!
const blobUrlCache = new Map<MemeId, string>();
let preloadStarted = false;

/**
 * Background-preloads all 6 meme videos (~2.1 MB total) into local browser memory Blob URLs
 * so pressing any meme plays instantaneously with sound on mobile & desktop!
 */
export function preloadAllMemes(): void {
  if (typeof window === "undefined" || preloadStarted) return;
  preloadStarted = true;

  for (const meme of MEME_CATALOG) {
    if (blobUrlCache.has(meme.id)) continue;
    fetch(meme.url, { cache: "force-cache" })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (blob) {
          blobUrlCache.set(meme.id, URL.createObjectURL(blob));
        }
      })
      .catch(() => {
        // Fallback cleanly to network URL if preload fails
      });
  }
}

export function getMemePlayableSrc(id: MemeId): string {
  const cached = blobUrlCache.get(id);
  if (cached) return cached;
  return getMemeById(id)?.url ?? "";
}

export function isMemePreloaded(id: MemeId): boolean {
  return blobUrlCache.has(id);
}
