import { useEffect, useState } from "react";
import {
  BookOpen,
  Coffee,
  Laptop,
  Shirt,
  Sparkles,
  Bed,
  PenTool,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/motion";

export interface MapListing {
  name: string;
  price: number;
  categorySlug?: string;
  store?: string;
}

const icons: Record<string, LucideIcon> = {
  textbooks: BookOpen,
  electronics: Laptop,
  stationery: PenTool,
  fashion: Shirt,
  food: Coffee,
  hostel: Bed,
  sports: Dumbbell,
  services: Sparkles,
};

/** Where listings appear on the map (percent of the map box) and which place they sit at. */
const spots: { place: string; style: { left?: string; right?: string; top: string } }[] = [
  { place: "Hall 2", style: { left: "25%", top: "33%" } },
  { place: "Academic block", style: { right: "3%", top: "4%" } },
  { place: "Food court", style: { right: "3%", top: "51%" } },
  { place: "Library", style: { left: "3%", top: "84%" } },
];

// The walk from a seller at Hall 2 to a buyer at the food court, along the walkways.
const ROUTE = "M120 118 L120 210 L300 210 L300 330 L420 330";

/**
 * The product's moment: a small DIU-style campus map where a seller's listing
 * travels along the walkway to the buyer. Listings pin themselves to places on
 * campus. Everything here is decorative; real listings are linked elsewhere.
 */
export function CampusRouteMap({
  listings,
  className,
}: {
  listings: MapListing[];
  className?: string;
}) {
  const pins = listings.slice(0, spots.length);
  const [motion, setMotion] = useState(false);
  useEffect(() => setMotion(!prefersReducedMotion()), []);

  return (
    <div
      className={cn(
        "relative isolate aspect-[560/440] w-full overflow-hidden rounded-[28px] border border-border bg-surface shadow-[var(--shadow-card-hover)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 560 440" className="absolute inset-0 size-full">
        <defs>
          <pattern id="cc-dots" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="var(--color-foreground)" opacity="0.07" />
          </pattern>
        </defs>
        <rect width="560" height="440" fill="var(--color-background)" />
        <rect width="560" height="440" fill="url(#cc-dots)" />

        {/* lawns and the playing field */}
        <rect x="24" y="236" width="232" height="180" rx="22" fill="var(--color-accent-soft)" />
        <rect x="332" y="24" width="204" height="160" rx="22" fill="var(--color-accent-soft)" />
        <rect
          x="360"
          y="52"
          width="148"
          height="104"
          rx="52"
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <line
          x1="434"
          y1="52"
          x2="434"
          y2="156"
          stroke="var(--color-accent)"
          strokeOpacity="0.25"
          strokeWidth="2"
        />

        {/* a pond */}
        <path
          d="M460 250 C 520 240, 540 300, 510 330 C 480 360, 430 340, 440 300 C 446 276, 440 256, 460 250 Z"
          fill="var(--color-primary-soft)"
        />

        {/* walkways */}
        <g
          stroke="var(--color-surface)"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path d="M120 40 L120 210 L540 210" />
          <path d="M300 210 L300 420" />
          <path d="M300 330 L540 330" />
          <path d="M20 330 L300 330" />
        </g>
        <g stroke="var(--color-border)" strokeWidth="1" fill="none" strokeDasharray="2 6">
          <path d="M120 40 L120 210 L540 210" />
          <path d="M300 210 L300 420" />
          <path d="M300 330 L540 330" />
          <path d="M20 330 L300 330" />
        </g>

        {/* buildings */}
        <g fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5">
          <rect x="44" y="52" width="58" height="86" rx="10" />
          <rect x="146" y="64" width="128" height="72" rx="12" />
          <rect x="44" y="262" width="72" height="50" rx="10" />
          <rect x="140" y="352" width="120" height="56" rx="12" />
          <rect x="330" y="232" width="92" height="74" rx="12" />
          <rect x="356" y="350" width="84" height="56" rx="12" />
        </g>
        <g
          fill="var(--color-muted-foreground)"
          fontSize="10"
          fontFamily="Inter, sans-serif"
          opacity="0.8"
        >
          <text x="73" y="100" textAnchor="middle">
            Hall 2
          </text>
          <text x="210" y="104" textAnchor="middle">
            Academic block
          </text>
          <text x="80" y="292" textAnchor="middle">
            Library
          </text>
          <text x="376" y="296" textAnchor="middle">
            Food court
          </text>
        </g>

        {/* the route: drawn once, then a parcel walks it */}
        <path
          d={ROUTE}
          fill="none"
          stroke="var(--color-bloom)"
          strokeOpacity="0.28"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={ROUTE}
          fill="none"
          stroke="var(--color-bloom)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="700"
          strokeDashoffset="700"
          style={{ animation: "cc-draw 1600ms var(--ease-bloom) 500ms forwards" }}
        />

        {/* seller and buyer */}
        <g transform="translate(120 118)">
          <circle r="9" fill="var(--color-ink)" />
          <circle r="3.5" fill="var(--color-bloom)" />
        </g>
        <g transform="translate(420 330)">
          <circle
            r="12"
            fill="var(--color-bloom)"
            opacity="0.35"
            style={{
              transformOrigin: "center",
              animation: "cc-live 1800ms ease-out 2100ms infinite",
            }}
          />
          <circle r="9" fill="var(--color-bloom)" stroke="var(--color-ink)" strokeWidth="2.5" />
        </g>

        {/* the parcel walking the route; SMIL keeps it on the walkway at any size */}
        {motion && (
          <g>
            <animateMotion
              path={ROUTE}
              dur="4.2s"
              begin="2.1s"
              repeatCount="indefinite"
              calcMode="spline"
              keyPoints="0;1;1"
              keyTimes="0;0.8;1"
              keySplines="0.22 1 0.36 1; 0 0 1 1"
            />
            <rect x="-14" y="-14" width="28" height="28" rx="8" fill="var(--color-ink)" />
            <g
              transform="translate(-8 -8) scale(0.667)"
              fill="none"
              stroke="var(--color-bloom)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
              <path d="m3 8 9 5 9-5M12 13v8" />
            </g>
          </g>
        )}
      </svg>

      {/* listings pinned to places on campus */}
      {pins.map((pin, i) => {
        const spot = spots[i] ?? spots[0]!;
        const Icon = icons[pin.categorySlug ?? ""] ?? Sparkles;
        return (
          <div
            key={`${pin.name}-${i}`}
            className={cn(
              "absolute flex max-w-[44%] items-center gap-2 rounded-[12px] border border-border bg-surface/95 py-1.5 pl-1.5 pr-3 shadow-[var(--shadow-card)] backdrop-blur-sm",
              i >= 2 && "max-sm:hidden",
            )}
            style={{
              ...spot.style,
              animation: `cc-pin 700ms var(--ease-bloom) ${900 + i * 220}ms both`,
            }}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-bloom-soft text-bloom-ink">
              <Icon className="size-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium leading-tight text-foreground">
                {pin.name}
              </span>
              <span className="block text-[11px] leading-tight text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">
                  {formatPrice(pin.price)}
                </span>
                {" · "}
                {spot.place}
              </span>
            </span>
          </div>
        );
      })}

      {/* the walk itself, as the buyer would read it */}
      <div
        className="absolute bottom-3 right-3 flex items-center gap-3 rounded-[16px] bg-ink px-4 py-3 text-ink-foreground sm:bottom-4 sm:right-4"
        style={{ animation: "cc-rise 600ms var(--ease-bloom) 1900ms both" }}
      >
        <span className="relative grid size-2.5 place-items-center">
          <span
            className="absolute inset-0 rounded-full bg-bloom"
            style={{ animation: "cc-live 1600ms ease-out infinite" }}
          />
          <span className="size-2.5 rounded-full bg-bloom" />
        </span>
        <span className="text-[13px] leading-tight">
          <span className="font-medium">Hand-over at the food court</span>
          <span className="block text-[11px] text-ink-foreground/70">
            From Hall 2 · about a 6 minute walk
          </span>
        </span>
      </div>
    </div>
  );
}
