import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { easedScrollBy } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A horizontal rail you can swipe, with previous/next arrows on larger screens that
 * glide with slow-in, slow-out easing. Arrows appear only when there is more to see.
 */
export function ScrollRail({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro?.disconnect();
    };
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) easedScrollBy(el, dir * el.clientWidth * 0.8);
  };

  const arrow =
    "absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/95 text-foreground shadow-[var(--shadow-card)] backdrop-blur transition-[opacity,transform] duration-200 hover:scale-105 active:scale-95 sm:grid";

  return (
    <div className="relative">
      <div ref={ref} className={className}>
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll back"
        onClick={() => go(-1)}
        className={cn(arrow, "-left-3", edges.start && "pointer-events-none opacity-0")}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Scroll forward"
        onClick={() => go(1)}
        className={cn(arrow, "-right-3", edges.end && "pointer-events-none opacity-0")}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
