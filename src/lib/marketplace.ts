import { useSyncExternalStore } from "react";
import { campuses } from "@/data/campuses";

/**
 * The university marketplace the buyer is shopping in. Every catalogue,
 * chat and checkout request sends it, and the API enforces it server-side.
 * Today only DIU is live; marking another campus "live" in src/data/campuses.ts
 * makes it selectable without other code changes.
 */
export const DEFAULT_MARKETPLACE = "diu";
const STORAGE_KEY = "campuscart.marketplace";

export const liveMarketplaces = (): string[] =>
  campuses.filter((c) => c.status === "live").map((c) => c.slug);

const listeners = new Set<() => void>();

function read(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && liveMarketplaces().includes(saved)) return saved;
  } catch {
    /* storage blocked */
  }
  return DEFAULT_MARKETPLACE;
}

export function setMarketplace(slug: string) {
  if (!liveMarketplaces().includes(slug)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, slug);
  } catch {
    /* storage blocked: keep default */
  }
  listeners.forEach((l) => l());
}

export function useMarketplace(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => DEFAULT_MARKETPLACE,
  );
}

export const marketplaceName = (slug: string) =>
  campuses.find((c) => c.slug === slug)?.shortName ?? slug.toUpperCase();
