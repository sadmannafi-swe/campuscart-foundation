import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { setTheme, useTheme } from "@/lib/theme";

/**
 * Light/dark switch drawn as a match on a matchbox striker.
 * Dark → light: the match is struck along the strip (sparks), catches, and its light
 * spreads across the page. Light → dark: the flame goes out in a curl of smoke, the
 * dark closes in from the match, and the spent match slides back and is replaced.
 *
 * phase: dark (unlit, left) · strike · lit (right, burning) · out (smoke) · return
 */
type Phase = "dark" | "strike" | "lit" | "out" | "return";

const STRIKE_MS = 460;
const OUT_MS = 230;
const SMOKE_MS = 850;
const RETURN_MS = 480;

export function MatchToggle({ className, size = 10 }: { className?: string; size?: number }) {
  const theme = useTheme();
  const [phase, setPhase] = useState<Phase>(theme === "light" ? "lit" : "dark");
  const [ignited, setIgnited] = useState(false); // play the flare only after a real strike
  const busy = useRef(false);
  const headRef = useRef<HTMLSpanElement>(null);
  const timers = useRef<number[]>([]);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  // Follow theme changes made elsewhere (another switch, the device setting).
  useEffect(() => {
    if (busy.current) return;
    setPhase(theme === "light" ? "lit" : "dark");
  }, [theme]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const headCenter = () => {
    const r = headRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
  };

  function toggle() {
    if (busy.current) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const next = theme === "light" ? "dark" : "light";
      setTheme(next);
      setPhase(next === "light" ? "lit" : "dark");
      return;
    }
    busy.current = true;
    if (theme === "dark") {
      setPhase("strike");
      later(STRIKE_MS, () => {
        setIgnited(true);
        setPhase("lit");
        setTheme("light", headCenter());
      });
      later(STRIKE_MS + 700, () => (busy.current = false));
    } else {
      setPhase("out");
      later(OUT_MS, () => setTheme("dark", headCenter()));
      later(OUT_MS + SMOKE_MS, () => setPhase("return"));
      later(OUT_MS + SMOKE_MS + RETURN_MS, () => {
        setPhase("dark");
        setIgnited(false);
        busy.current = false;
      });
    }
  }

  const isLight = theme === "light";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label="Light mode"
      title={isLight ? "Blow out the match (dark mode)" : "Strike the match (light mode)"}
      onClick={toggle}
      data-phase={phase}
      data-ignited={ignited ? "" : undefined}
      className={cn("match-toggle", className)}
      style={{ fontSize: size }}
    >
      <span className="mt-glow" aria-hidden="true" />
      <span className="mt-box" aria-hidden="true">
        <span className="mt-strip" />
      </span>
      <span className="mt-sparks" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <i key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </span>
      <span className="mt-stickclip" aria-hidden="true">
        <span className="mt-stick" />
      </span>
      <span className="mt-head" ref={headRef} aria-hidden="true">
        <span className="mt-char" />
        <span className="mt-flame">
          <svg viewBox="0 0 20 40">
            <defs>
              <linearGradient id={`fo${uid}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#fff4c2" />
                <stop offset="0.35" stopColor="#ffd040" />
                <stop offset="0.72" stopColor="#ff8a1c" />
                <stop offset="1" stopColor="#e2500d" />
              </linearGradient>
              <radialGradient id={`fb${uid}`} cx="50%" cy="80%" r="45%">
                <stop offset="0" stopColor="#6d9bff" stopOpacity="0.95" />
                <stop offset="1" stopColor="#6d9bff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path
              className="mt-fl-outer"
              d="M10 1 C 13 9, 19 16, 18 26 C 17.5 34, 13.5 39, 10 39 C 6.5 39, 2.5 34, 2 26 C 1 16, 7 9, 10 1 Z"
              fill={`url(#fo${uid})`}
            />
            <path
              className="mt-fl-inner"
              d="M10 13 C 12 19, 15 23, 14.5 29 C 14 34, 12 37, 10 37 C 8 37, 6 34, 5.5 29 C 5 23, 8 19, 10 13 Z"
              fill="#fff8dc"
            />
            <ellipse cx="10" cy="33" rx="6" ry="5" fill={`url(#fb${uid})`} />
          </svg>
        </span>
      </span>
      {/* smoke stays where the flame went out while the spent match slides back */}
      <span className="mt-smoke" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}
