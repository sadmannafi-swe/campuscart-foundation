import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * The four homepage shortcuts. Each has its own animated icon and a light background
 * effect that fits what it opens (styles: `.sc-*` in styles.css). The loops are slow
 * and small; hovering (or pressing, on phones) makes them livelier. Everything is
 * still with reduced motion.
 */

type Kind = "shop" | "preowned" | "blood" | "basha";

const tiles: {
  kind: Kind;
  label: string;
  to: "/products" | "/preowned" | "/blood" | "/basha";
  badge: string;
  icon: ReactNode;
  scene?: ReactNode;
}[] = [
  {
    kind: "shop",
    label: "Shop Now",
    to: "/products",
    badge: "bg-ink text-bloom",
    icon: <ShopIcon />,
    scene: <ShopScene />,
  },
  {
    kind: "preowned",
    label: "Pre-Owned",
    to: "/preowned",
    badge: "bg-preowned-soft text-preowned",
    icon: <PreownedIcon />,
    scene: <PreownedScene />,
  },
  {
    kind: "blood",
    label: "Blood Donor",
    to: "/blood",
    badge: "bg-blood-soft text-blood",
    icon: <BloodIcon />,
    scene: <BloodScene />,
  },
  {
    kind: "basha",
    label: "BasaLagbe",
    to: "/basha",
    badge: "bg-basha-soft text-basha",
    icon: <BashaIcon />,
    scene: <BashaScene />,
  },
];

export function ShortcutTiles() {
  return (
    <nav aria-label="Shortcuts" className="grid grid-cols-2 gap-2.5 sm:gap-3">
      {tiles.map((t, i) => (
        <Link
          key={t.kind}
          to={t.to}
          style={{ "--i": i } as CSSProperties}
          className={cn(
            "hero-shortcut sc-tile group relative isolate flex h-14 items-center gap-2.5 overflow-hidden rounded-[16px] border border-border bg-surface px-3 text-foreground shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98] sm:h-16",
            `sc-${t.kind}`,
          )}
        >
          <span className="sc-scene pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            {t.scene}
          </span>
          <span
            className={cn(
              "sc-badge relative grid size-10 shrink-0 place-items-center rounded-[12px]",
              t.badge,
            )}
          >
            {t.icon}
          </span>
          <span className="min-w-0 truncate text-[15px] font-semibold sm:text-base">{t.label}</span>
          <ArrowRight
            className="ml-auto hidden size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
            aria-hidden="true"
          />
        </Link>
      ))}
    </nav>
  );
}

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-[22px] overflow-visible",
  "aria-hidden": true,
};

/** A cart that items keep dropping into; its wheels roll and speed lines show on hover. */
function ShopIcon() {
  return (
    <svg {...svg}>
      <g className="sc-shop-speed" strokeWidth={1.5}>
        <path d="M-1.5 9.5h2.5M-2.5 12.5h3" />
      </g>
      <g className="sc-shop-items" stroke="none" fill="currentColor">
        <rect className="sc-shop-item1" x="8.6" y="6.4" width="3.6" height="3.6" rx="0.7" />
        <rect className="sc-shop-item2" x="13.2" y="5.6" width="2.9" height="4.4" rx="0.9" />
      </g>
      <g className="sc-shop-cart">
        <path d="M2.5 3.5h2.3l2.2 10.3a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L19.8 8H6" />
        <g className="sc-wheel">
          <circle cx="9.3" cy="19.2" r="1.5" />
          <path d="M8.3 19.2h2" strokeWidth={1.2} />
        </g>
        <g className="sc-wheel">
          <circle cx="16.4" cy="19.2" r="1.5" />
          <path d="M15.4 19.2h2" strokeWidth={1.2} />
        </g>
      </g>
    </svg>
  );
}

/** Taka coins and sparkles rising softly from the right edge. */
function ShopScene() {
  return (
    <>
      <span className="sc-coin" style={{ "--d": "0s", right: "14%" } as CSSProperties}>
        ৳
      </span>
      <span className="sc-coin" style={{ "--d": "1.6s", right: "6%" } as CSSProperties}>
        ৳
      </span>
      <span
        className="sc-spark"
        style={{ "--d": "0.4s", right: "22%", top: "22%" } as CSSProperties}
      />
      <span
        className="sc-spark"
        style={{ "--d": "1.9s", right: "10%", top: "64%" } as CSSProperties}
      />
    </>
  );
}

/** A shopping bag inside turning "reuse" arrows, with a swinging second-hand price tag. */
function PreownedIcon() {
  return (
    <svg {...svg}>
      <g className="sc-cycle" strokeWidth={1.5}>
        <path d="M2.6 8.6A10 10 0 0 1 15.4 2.6" />
        <path d="M13.9 0.4l1.5 2.2-2.6.8" />
        <path d="M21.4 15.4A10 10 0 0 1 8.6 21.4" />
        <path d="M10.1 23.6l-1.5-2.2 2.6-.8" />
      </g>
      <path d="M7.4 9.5h9.2l-.8 8.4a1.4 1.4 0 0 1-1.4 1.2H9.6a1.4 1.4 0 0 1-1.4-1.2Z" />
      <path d="M9.7 9.5V8.3a2.3 2.3 0 0 1 4.6 0v1.2" />
      <g className="sc-tag" strokeWidth={1.4}>
        <path d="M14.3 9.6l1.4 2.4" />
        <path
          d="M15.2 11.9l2.5-.2.9 2.9-2.4 1-1.6-2.1Z"
          fill="currentColor"
          className="sc-tag-face"
        />
      </g>
    </svg>
  );
}

/** Leaves drifting across: the "reuse" feel of second-hand shopping. */
function PreownedScene() {
  return (
    <>
      <span className="sc-leaf" style={{ "--d": "0s", top: "18%" } as CSSProperties} />
      <span className="sc-leaf" style={{ "--d": "2.4s", top: "58%" } as CSSProperties} />
    </>
  );
}

/** A beating blood drop with a medical cross; a smaller drop falls in now and then. */
function BloodIcon() {
  return (
    <svg {...svg}>
      <path
        className="sc-falling-drop"
        d="M12 -3.4c.9 1.2 1.5 2 1.5 2.8a1.5 1.5 0 0 1-3 0c0-.8.6-1.6 1.5-2.8Z"
        fill="currentColor"
        stroke="none"
      />
      <g className="sc-heart">
        <path
          d="M12 3c3.3 4.1 5.8 7.2 5.8 10.4a5.8 5.8 0 0 1-11.6 0C6.2 10.2 8.7 7.1 12 3Z"
          fill="currentColor"
          stroke="none"
        />
        <path d="M12 11.2v4.8M9.6 13.6h4.8" className="sc-cross" strokeWidth={1.7} />
      </g>
    </svg>
  );
}

/** A heartbeat (ECG) line tracing across the tile. */
function BloodScene() {
  return (
    <svg
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
      className="sc-ecg absolute inset-x-0 bottom-0.5 h-3.5 w-full"
      fill="none"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M0 22H96l5-9 6 20 6-28 6 23 4-6H200" pathLength={100} />
    </svg>
  );
}

/** A home with chimney smoke and windows whose lights switch on in turn. */
function BashaIcon() {
  return (
    <svg {...svg}>
      <g className="sc-smoke" fill="currentColor" stroke="none">
        <circle cx="17" cy="3.2" r="1" style={{ "--d": "0s" } as CSSProperties} />
        <circle cx="17.6" cy="3.2" r="0.8" style={{ "--d": "1.2s" } as CSSProperties} />
      </g>
      <path d="M16 7.6V4.8h2v4.4" />
      <path d="M3.2 11.2 12 4l8.8 7.2" />
      <path d="M5.5 9.6v9.9h13V9.6" />
      <path d="M10.4 19.5v-4.2h3.2v4.2" />
      <rect className="sc-window sc-window1" x="7" y="11.4" width="2.6" height="2.4" rx="0.4" />
      <rect className="sc-window sc-window2" x="14.4" y="11.4" width="2.6" height="2.4" rx="0.4" />
    </svg>
  );
}

/** A small swinging TO-LET sign and a key, like the boards on Dhaka gates. */
function BashaScene() {
  return (
    <>
      <span className="sc-tolet hidden sm:block">TO-LET</span>
      <svg
        viewBox="0 0 24 24"
        className="sc-key absolute"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      >
        <circle cx="7.5" cy="12" r="3.5" />
        <path d="M11 12h10M17.5 12v3M20.5 12v2.4" />
      </svg>
    </>
  );
}
