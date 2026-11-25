import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "campuscart.theme";
const THEME_COLOR: Record<Theme, string> = { light: "#f7f4ec", dark: "#1b2133" };
const EVENT = "campuscart:theme";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function paint(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Switch the theme. With `origin` (screen point, e.g. the match head) the new theme
 * spreads out from that point as a circle, with a short warm glow when the lights come
 * on. Falls back to an instant switch without the View Transitions API or with
 * reduced motion. The choice is remembered on this device.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: the theme still applies for this visit */
  }
  const root = document.documentElement;
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
  };
  if (!origin || !doc.startViewTransition || reducedMotion()) {
    paint(theme);
    window.dispatchEvent(new Event(EVENT));
    return;
  }

  const { x, y } = origin;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.dataset["themeSwitch"] = theme;
  let glow: HTMLDivElement | null = null;
  const transition = doc.startViewTransition(() => {
    paint(theme);
    // The new view is live during the reveal, so this glow fades as the light spreads.
    if (theme === "light") {
      glow = document.createElement("div");
      glow.className = "theme-glow";
      glow.style.setProperty("--gx", `${x}px`);
      glow.style.setProperty("--gy", `${y}px`);
      document.body.appendChild(glow);
    }
    window.dispatchEvent(new Event(EVENT));
  });
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: theme === "light" ? 900 : 750,
          easing: "cubic-bezier(0.5, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => {
    delete root.dataset["themeSwitch"];
    setTimeout(() => glow?.remove(), 900);
  });
}

// Every visitor starts in light mode; dark applies only after they pick it (setTheme).
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}
