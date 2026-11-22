import { useState } from "react";

/**
 * Tracks whether an image URL failed to load, so components can show their
 * existing placeholder (initials, category icon…) instead of a broken image.
 * Resets automatically when the URL changes.
 */
export function useImageFallback(src: string | null | undefined) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return {
    showImage: Boolean(src) && failedSrc !== src,
    onError: () => setFailedSrc(src ?? null),
  };
}
