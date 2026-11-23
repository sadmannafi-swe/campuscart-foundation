import { useEffect, useState, type CSSProperties } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * A one-off celebration: graduation caps and daffodil petals tossed into the air.
 * Purely decorative, plays once, skipped for reduced motion.
 */
export function CapToss({ count = 14 }: { count?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center [perspective:600px]"
    >
      {Array.from({ length: count }, (_, i) => {
        const cap = i % 3 !== 2;
        const spread = (i / (count - 1) - 0.5) * 2; // -1 … 1
        const style = {
          "--tx": `${Math.round(spread * 46)}vw`,
          "--peak": `${-55 - Math.round(Math.abs(Math.sin(i * 7.3)) * 30)}vh`,
          "--spin": `${(i % 2 ? 1 : -1) * (90 + ((i * 37) % 180))}deg`,
          animation: `cc-toss ${2200 + (i % 4) * 220}ms cubic-bezier(0.2, 0.7, 0.3, 1) ${i * 60}ms both`,
        } as CSSProperties;
        return (
          <span key={i} className="absolute bottom-0" style={style}>
            {cap ? (
              <svg
                viewBox="0 0 48 40"
                className="size-12 drop-shadow-[0_6px_10px_rgb(20_33_61/0.25)]"
              >
                <path d="M24 4 46 14 24 24 2 14Z" fill="var(--color-ink)" />
                <path d="M12 19v9c0 3 5.4 6 12 6s12-3 12-6v-9l-12 5Z" fill="var(--color-ink)" />
                <path d="M24 14 40 17v11" fill="none" stroke="var(--color-bloom)" strokeWidth="2" />
                <circle cx="40" cy="30" r="2.6" fill="var(--color-bloom)" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" className="size-6">
                <path
                  d="M10 1 C 15 5, 15 13, 10 19 C 5 13, 5 5, 10 1 Z"
                  fill="var(--color-bloom)"
                />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}
