import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { Reveal } from "@/components/motion/Reveal";
import { categories } from "@/data/categories";
import { useCategoryCounts } from "@/lib/liveCatalog";
import { cn } from "@/lib/utils";

// three.js only downloads when this section comes near the screen.
const CampusDeskScene = lazy(() => import("./CampusDeskScene"));

/** Categories that have an object on the 3D desk. */
const deskSlugs = ["textbooks", "electronics", "services", "stationery", "food", "sports"];

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * "Shop by what's on your desk": a 3D study desk where every object is a category.
 * The list beside it is the accessible way in; hovering either one highlights both.
 */
export function CategoryDesk() {
  const navigate = useNavigate();
  const counts = useCategoryCounts();
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [gl, setGl] = useState(true);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    setGl(webglAvailable());
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const items = categories.filter((c) => deskSlugs.includes(c.slug));
  const go = (slug: string) =>
    void navigate({ to: "/products", search: { category: slug, q: undefined, sort: undefined } });

  return (
    <section className="container-page pt-14">
      <div className="grid items-center gap-6 overflow-hidden rounded-[28px] border border-border bg-surface lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <div className="p-6 sm:p-8 lg:py-10 lg:pl-10 lg:pr-0">
          <Reveal>
            <p className="text-xs font-medium text-bloom-ink">Categories</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Shop what&apos;s on your desk
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Pick an object on the desk, or a category below, to see what DIU students are selling.
            </p>
          </Reveal>
          <ul className="mt-6 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            {items.map((c, i) => (
              <Reveal as="li" key={c.slug} delay={80 + i * 50}>
                <Link
                  to="/products"
                  search={{ category: c.slug, q: undefined, sort: undefined }}
                  onMouseEnter={() => setActive(c.slug)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(c.slug)}
                  onBlur={() => setActive(null)}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-sm transition-[background-color,border-color,transform] duration-200",
                    active === c.slug
                      ? "-translate-y-0.5 border-foreground/20 bg-bloom-soft"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  <CategoryIcon
                    name={c.icon}
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-300",
                      active === c.slug
                        ? "-rotate-12 scale-110 text-bloom-ink"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {counts[c.slug] ?? 0}
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
          <Link
            to="/categories"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline decoration-bloom decoration-2 underline-offset-4"
          >
            All categories <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div
          ref={box}
          aria-hidden="true"
          className="relative order-first h-[280px] bg-[radial-gradient(ellipse_at_50%_60%,var(--color-bloom-soft),transparent_70%)] sm:h-[380px] lg:order-none lg:h-[460px]"
        >
          {near && gl && (
            <Suspense fallback={null}>
              <div className="absolute inset-0 animate-rise">
                <CampusDeskScene active={active} onHover={setActive} onSelect={go} />
              </div>
            </Suspense>
          )}
          {active && (
            <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-ink-foreground shadow-[var(--shadow-card)]">
              {categories.find((c) => c.slug === active)?.name} · open
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
