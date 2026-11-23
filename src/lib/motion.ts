import { useEffect, useRef, useState } from "react";

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Tweens a number from 0 to `value` once the element is visible. */
export function useCountUp(value: number, duration = 1200) {
  const ref = useRef<HTMLElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        setDisplay(Math.round(value * eased));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return { ref, display };
}

/**
 * Sends a small daffodil token from `from` to the cart icon in the header
 * (any element with data-cart-target that is visible), then bumps the icon.
 */
export function flyToCart(from: Element | null) {
  if (typeof document === "undefined" || !from) return;
  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]"));
  const target = targets.find((t) => t.getBoundingClientRect().width > 0);
  if (!target) return;

  const bump = () => {
    target.classList.remove("animate-bump");
    void target.offsetWidth;
    target.classList.add("animate-bump");
  };
  if (prefersReducedMotion()) return bump();

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  dot.style.cssText = `position:fixed;z-index:100;left:${a.left + a.width / 2 - 10}px;top:${a.top + a.height / 2 - 10}px;width:20px;height:20px;border-radius:999px;background:var(--color-bloom);box-shadow:0 0 0 3px var(--color-surface);pointer-events:none;`;
  document.body.appendChild(dot);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = dot.animate(
    [
      { transform: "translate(0,0) scale(1)" },
      { transform: `translate(${dx * 0.45}px, ${dy - 120}px) scale(1.15)`, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.4)` },
    ],
    { duration: 720, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
  anim.onfinish = () => {
    dot.remove();
    bump();
  };
}
