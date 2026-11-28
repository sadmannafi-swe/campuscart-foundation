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

/** Quadratic Bézier from a to b that arcs `lift` px above the higher of the two points. */
function arcPath(ax: number, ay: number, bx: number, by: number, lift: number) {
  const cx = ax + (bx - ax) * 0.45;
  const cy = Math.min(ay, by) - lift;
  return { d: `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`, cx, cy };
}

const supportsMotionPath = () =>
  typeof CSS !== "undefined" && CSS.supports?.("offset-path", 'path("M0 0 L1 1")');

/** A thin curved trail drawn along `d`, then faded (the line behind a flying item). */
function drawTrail(d: string, duration: number) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;z-index:99;pointer-events:none;overflow:visible";
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linecap", "round");
  path.style.color = "color-mix(in oklch, var(--color-foreground) 35%, transparent)";
  svg.appendChild(path);
  document.body.appendChild(svg);
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`;
  path
    .animate(
      [
        { strokeDashoffset: len, opacity: 1 },
        { strokeDashoffset: 0, opacity: 1, offset: 0.7 },
        { strokeDashoffset: 0, opacity: 0 },
      ],
      { duration: duration + 260, easing: "cubic-bezier(0.45, 0, 0.25, 1)" },
    )
    .finished.then(
      () => svg.remove(),
      () => svg.remove(),
    );
}

/**
 * Add-to-cart flight: the product photo (or a daffodil token when there's no photo)
 * lifts off `from`, flies along a curved, drawn path to the header cart (any visible
 * element with data-cart-target), then the cart bumps and petals burst.
 */
export function flyToCart(from: Element | null, image?: string | null | undefined) {
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
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  const bx = b.left + b.width / 2;
  const by = b.top + b.height / 2;
  const size = image ? 46 : 20;
  const token = document.createElement("span");
  token.setAttribute("aria-hidden", "true");
  token.style.cssText = `position:fixed;z-index:100;left:0;top:0;width:${size}px;height:${size}px;border-radius:999px;pointer-events:none;box-shadow:0 0 0 3px var(--color-surface),0 10px 24px oklch(0.2 0.04 265 / 25%);${
    image
      ? `background:var(--color-surface) center/cover no-repeat url("${image.replace(/"/g, "%22")}");`
      : "background:var(--color-bloom);"
  }`;
  document.body.appendChild(token);

  const duration = 860;
  const easing = "cubic-bezier(0.45, 0, 0.25, 1)"; // slow in, slow out
  const { d, cx, cy } = arcPath(ax, ay, bx, by, 140);
  drawTrail(d, duration);
  let anim: Animation;
  if (supportsMotionPath()) {
    token.style.offsetPath = `path("${d}")`;
    token.style.offsetRotate = "0deg";
    anim = token.animate(
      [
        { offsetDistance: "0%", transform: "scale(0.6)", opacity: 0.4 },
        { offsetDistance: "12%", transform: "scale(1.1)", opacity: 1, offset: 0.12 },
        { offsetDistance: "100%", transform: "scale(0.35)", opacity: 0.9 },
      ],
      { duration, easing, fill: "forwards" },
    );
  } else {
    token.style.transform = `translate(${ax - size / 2}px, ${ay - size / 2}px)`;
    const at = (x: number, y: number, s: number) =>
      `translate(${x - size / 2}px, ${y - size / 2}px) scale(${s})`;
    anim = token.animate(
      [
        { transform: at(ax, ay, 0.6) },
        { transform: at((ax + cx) / 2, (ay + cy) / 2 + 20, 1.1), offset: 0.4 },
        { transform: at(bx, by, 0.35) },
      ],
      { duration, easing, fill: "forwards" },
    );
  }
  anim.onfinish = () => {
    token.remove();
    bump();
    petalBurst(target);
  };
}

/**
 * Chat "send": a paper plane leaves the button on a curved, drawn path up and to the
 * right, turning into its flight and fading out.
 */
export function flyPaperPlane(from: Element | null) {
  if (typeof document === "undefined" || !from || prefersReducedMotion()) return;
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  const bx = Math.min(ax + 70, window.innerWidth - 16);
  const by = Math.max(ay - 150, 16);
  const plane = document.createElement("span");
  plane.setAttribute("aria-hidden", "true");
  plane.innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 21.7a.5.5 0 0 0 .9 0L21.9 3a.5.5 0 0 0-.6-.6L2.3 8.8a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1z"/><path d="m21.9 2.1-10.9 10.9"/></svg>';
  plane.style.cssText = `position:fixed;z-index:100;left:${ax - 11}px;top:${ay - 11}px;width:22px;height:22px;color:var(--color-primary);pointer-events:none;`;
  document.body.appendChild(plane);
  const { d } = arcPath(ax, ay, bx, by, 40);
  drawTrail(d, 620);
  plane
    .animate(
      [
        { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
        {
          transform: `translate(${(bx - ax) * 0.3}px, ${(by - ay) * 0.55}px) rotate(-12deg) scale(1.15)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(${bx - ax}px, ${by - ay}px) rotate(18deg) scale(0.7)`,
          opacity: 0,
        },
      ],
      { duration: 680, easing: "cubic-bezier(0.45, 0, 0.25, 1)" },
    )
    .finished.then(
      () => plane.remove(),
      () => plane.remove(),
    );
}

/** Scroll a rail by `dx` px with slow-in, slow-out easing (not the browser's linear-ish default). */
export function easedScrollBy(el: HTMLElement, dx: number, duration = 650) {
  const start = el.scrollLeft;
  const max = el.scrollWidth - el.clientWidth;
  const end = Math.max(0, Math.min(max, start + dx));
  if (prefersReducedMotion()) {
    el.scrollLeft = end;
    return;
  }
  const snap = el.style.scrollSnapType;
  el.style.scrollSnapType = "none"; // snapping would fight the tween
  const t0 = performance.now();
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration);
    el.scrollLeft = start + (end - start) * ease(p);
    if (p < 1) requestAnimationFrame(step);
    else el.style.scrollSnapType = snap;
  };
  requestAnimationFrame(step);
}

/**
 * Pointer-driven 3D tilt for cards. Sets --rx/--ry (degrees) and --gx/--gy (sheen
 * position, %) on the element. Only for mouse/trackpad users without reduced motion.
 */
export function useTilt<T extends HTMLElement>(max = 6) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--ry", `${((x - 0.5) * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${((0.5 - y) * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
        el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, [max]);
  return ref;
}

/** A small burst of daffodil petals around an element (used when the cart receives an item). */
export function petalBurst(target: Element, count = 8) {
  if (typeof document === "undefined" || prefersReducedMotion()) return;
  const r = target.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  for (let i = 0; i < count; i++) {
    const petal = document.createElement("span");
    petal.setAttribute("aria-hidden", "true");
    petal.style.cssText = `position:fixed;z-index:100;left:${cx - 4}px;top:${cy - 6}px;width:8px;height:12px;border-radius:50% 50% 50% 50% / 70% 70% 30% 30%;background:var(--color-bloom);pointer-events:none;`;
    document.body.appendChild(petal);
    const angle = (i / count) * Math.PI * 2;
    const dist = 26 + (i % 3) * 8;
    petal
      .animate(
        [
          {
            transform: `rotate(${(angle * 180) / Math.PI}deg) translateY(0) scale(0.4)`,
            opacity: 1,
          },
          {
            transform: `rotate(${(angle * 180) / Math.PI}deg) translateY(${-dist}px) scale(1)`,
            opacity: 0,
          },
        ],
        { duration: 620, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      )
      .finished.then(
        () => petal.remove(),
        () => petal.remove(),
      );
  }
}
