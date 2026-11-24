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
import { diuCampus } from "@/data/diuCampusMap";

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

const { width: W, height: H, places } = diuCampus;
const WALK_MINUTES = Math.max(1, Math.round(diuCampus.routeMeters / 80));

/**
 * Listing cards sit on the open lawn in the north-east of the campus, each tied to a
 * real place by a thin leader line. Positions are in map units (W × H).
 */
const spots: { place: string; at: [number, number]; card: [number, number] }[] = [
  { place: "Knowledge Tower", at: places.knowledgeTower, card: [450, 40] },
  { place: "Basketball ground", at: places.basketball, card: [450, 128] },
  { place: "DIU Cafeteria", at: places.cafeteria, card: [450, 216] },
];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/**
 * The product's moment: the real Daffodil International University campus
 * (OpenStreetMap data), where a seller's parcel walks the actual road from
 * Knowledge Tower to the DIU Cafeteria. Decorative: real listings are linked elsewhere.
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
    <figure className={cn("relative w-full", className)}>
      <div
        className="relative isolate w-full overflow-hidden rounded-[28px] border border-border bg-surface shadow-[var(--shadow-card-hover)]"
        style={{ aspectRatio: `${W} / ${H}` }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <pattern id="cc-dots" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="var(--color-foreground)" opacity="0.06" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="var(--color-background)" />
          <rect width={W} height={H} fill="url(#cc-dots)" />

          {/* neighbourhood around the campus */}
          <g fill="var(--color-foreground)" opacity="0.06">
            {diuCampus.nearby.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/* the campus grounds */}
          <path
            d={diuCampus.campus}
            fill="var(--color-accent-soft)"
            stroke="var(--color-accent)"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
          {diuCampus.water.map((d, i) => (
            <path key={i} d={d} fill="var(--color-primary-soft)" />
          ))}
          {diuCampus.pitches.map((d, i) => (
            <path key={i} d={d} fill="var(--color-accent)" opacity="0.25" />
          ))}

          {/* roads */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {diuCampus.roads.map((d, i) => (
              <path key={i} d={d} stroke="var(--color-surface)" strokeWidth="9" />
            ))}
            {diuCampus.roads.map((d, i) => (
              <path key={`e${i}`} d={d} stroke="var(--color-border)" strokeWidth="1" />
            ))}
          </g>

          {/* campus buildings */}
          <g
            fill="var(--color-surface)"
            stroke="var(--color-foreground)"
            strokeOpacity="0.28"
            strokeWidth="1"
          >
            {diuCampus.buildings.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/* place names from OpenStreetMap */}
          <g
            fill="var(--color-muted-foreground)"
            fontSize="16"
            fontFamily="Inter, sans-serif"
            fontWeight="500"
            paintOrder="stroke"
            stroke="var(--color-background)"
            strokeWidth="4"
            className="max-sm:hidden"
          >
            <text x={places.knowledgeTower[0] + 8} y={places.knowledgeTower[1] - 60}>
              Knowledge Tower
            </text>
            <text x={places.basketball[0] + 18} y={places.basketball[1] - 14}>
              Basketball ground
            </text>
            <text x={places.cafeteria[0] - 18} y={places.cafeteria[1] + 5} textAnchor="end">
              DIU Cafeteria
            </text>
          </g>

          {/* leader lines from listing cards to their places */}
          <g
            fill="none"
            stroke="var(--color-foreground)"
            strokeOpacity="0.45"
            strokeWidth="1.25"
            strokeDasharray="3 4"
          >
            {pins.map((_, i) => {
              const s = spots[i]!;
              return (
                <path
                  key={i}
                  d={`M${s.card[0]} ${s.card[1] + 20} L${s.at[0]} ${s.at[1]}`}
                  className={cn(i >= 1 && "max-sm:hidden")}
                  style={{ animation: `cc-rise 600ms var(--ease-bloom) ${900 + i * 220}ms both` }}
                />
              );
            })}
          </g>

          {/* the walk: drawn once, then a parcel follows it */}
          <path
            d={diuCampus.route}
            fill="none"
            stroke="var(--color-bloom)"
            strokeOpacity="0.3"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={diuCampus.route}
            fill="none"
            stroke="var(--color-bloom)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            style={{ animation: "cc-draw 1600ms var(--ease-bloom) 500ms forwards" }}
          />

          {/* seller at Knowledge Tower, buyer at the cafeteria */}
          <g transform={`translate(${diuCampus.routeStart[0]} ${diuCampus.routeStart[1]})`}>
            <circle r="8" fill="var(--color-ink)" />
            <circle r="3" fill="var(--color-bloom)" />
          </g>
          <g transform={`translate(${diuCampus.routeEnd[0]} ${diuCampus.routeEnd[1]})`}>
            <circle
              r="11"
              fill="var(--color-bloom)"
              opacity="0.35"
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: "cc-live 1800ms ease-out 2100ms infinite",
              }}
            />
            <circle r="8" fill="var(--color-bloom)" stroke="var(--color-ink)" strokeWidth="2.5" />
          </g>

          {motion && (
            <g>
              <animateMotion
                path={diuCampus.route}
                dur="4.2s"
                begin="2.1s"
                repeatCount="indefinite"
                calcMode="spline"
                keyPoints="0;1;1"
                keyTimes="0;0.8;1"
                keySplines="0.22 1 0.36 1; 0 0 1 1"
              />
              <rect x="-13" y="-13" width="26" height="26" rx="7" fill="var(--color-ink)" />
              <g
                transform="translate(-7.5 -7.5) scale(0.625)"
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

        {/* listings tied to real places on campus */}
        {pins.map((pin, i) => {
          const spot = spots[i]!;
          const Icon = icons[pin.categorySlug ?? ""] ?? Sparkles;
          return (
            <div
              key={`${pin.name}-${i}`}
              aria-hidden="true"
              className={cn(
                "absolute flex max-w-[47%] items-center gap-2 rounded-[12px] border border-border bg-surface/95 py-1.5 pl-1.5 pr-3 shadow-[var(--shadow-card)] backdrop-blur-sm",
                i >= 1 && "max-sm:hidden",
              )}
              style={{
                left: pct(spot.card[0], W),
                top: pct(spot.card[1], H),
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
                <span className="block truncate text-[11px] leading-tight text-muted-foreground">
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

        {/* required credit for the map data (ODbL) */}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="absolute left-2 top-2 rounded-[6px] bg-surface/80 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
        >
          © OpenStreetMap contributors
        </a>
      </div>

      {/* the walk, as the buyer would read it: below the map on phones, over it on larger screens */}
      <figcaption
        className="mt-3 flex items-center gap-3 rounded-[16px] bg-ink px-4 py-3 text-ink-foreground sm:absolute sm:bottom-4 sm:right-4 sm:mt-0"
        style={{ animation: "cc-rise 600ms var(--ease-bloom) 1900ms both" }}
      >
        <span className="relative grid size-2.5 place-items-center" aria-hidden="true">
          <span
            className="absolute inset-0 rounded-full bg-bloom"
            style={{ animation: "cc-live 1600ms ease-out infinite" }}
          />
          <span className="size-2.5 rounded-full bg-bloom" />
        </span>
        <span className="text-[13px] leading-tight">
          <span className="font-medium">Hand-over at DIU Cafeteria</span>
          <span className="block text-[11px] text-ink-foreground/70">
            From Knowledge Tower · {diuCampus.routeMeters} m, about a {WALK_MINUTES} minute walk
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
