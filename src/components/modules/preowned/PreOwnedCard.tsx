import { Link } from "@tanstack/react-router";
import { MapPin, ShoppingBag } from "lucide-react";
import { PREOWNED_CONDITION_LABELS, type PreOwnedListing } from "@shared/types";
import { formatPrice } from "@/lib/format";
import { useTilt } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Pre-Owned listing card: photo, price, condition, location, seller, availability. */
export function PreOwnedCard({
  listing,
  className,
}: {
  listing: PreOwnedListing;
  className?: string;
}) {
  const tilt = useTilt<HTMLElement>(4);
  const sold = listing.status === "sold";
  return (
    <article
      ref={tilt}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[16px] border border-border bg-surface transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-bloom)] [transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] hover:border-preowned/40 hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-preowned-soft">
        {listing.images[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            loading="lazy"
            className={cn(
              "size-full object-cover transition-transform duration-700 ease-[var(--ease-bloom)] group-hover:scale-[1.04]",
              sold && "grayscale",
            )}
          />
        ) : (
          <span className="grid size-full place-items-center text-preowned">
            <ShoppingBag className="size-9" aria-hidden="true" />
          </span>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-[6px] bg-preowned px-1.5 py-0.5 text-[11px] font-semibold text-white">
          Pre-Owned
        </span>
        {sold && (
          <span className="absolute inset-0 grid place-items-center bg-ink/40">
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold">Sold</span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-snug">
          <Link to="/preowned/$listingId" params={{ listingId: listing.id }}>
            <span className="absolute inset-0" aria-hidden="true" />
            {listing.title}
          </Link>
        </h3>
        <div className="flex items-baseline gap-1.5">
          <span className="price-lg text-base">{formatPrice(listing.price)}</span>
          {listing.original_price && (
            <span className="text-xs tabular-nums text-muted-foreground line-through">
              {formatPrice(listing.original_price)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full bg-preowned-soft px-2 py-0.5 font-medium text-preowned">
            {PREOWNED_CONDITION_LABELS[listing.condition]}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{listing.location}</span>
          </span>
        </div>
        <p className="mt-auto truncate pt-1 text-xs text-muted-foreground">
          by {listing.owner.name}
          {!sold && <span className="text-accent"> · Available</span>}
        </p>
      </div>
    </article>
  );
}
