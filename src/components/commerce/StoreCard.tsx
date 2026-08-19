import { Link } from "@tanstack/react-router";
import { BadgeCheck, Store as StoreIcon } from "lucide-react";
import type { Store } from "@/lib/types";
import { Rating } from "@/components/common/Rating";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

export function StoreCard({ store, className }: { store: Store; className?: string }) {
  return (
    <article
      className={cn(
        "card-surface group relative flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      <div className={cn("h-20 bg-gradient-to-r", store.accentFrom, store.accentTo)} />
      <div className="-mt-8 px-5 pb-5">
        <div className="grid size-16 place-items-center rounded-2xl border border-border bg-surface text-lg font-extrabold text-primary shadow-sm">
          {store.initials}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex min-w-0 items-center gap-1.5 text-base font-bold">
              <Link to="/stores/$storeSlug" params={{ storeSlug: store.slug }} className="min-w-0 truncate">
                <span className="absolute inset-0" aria-hidden="true" />
                {store.name}
              </Link>
              {store.verified && (
                <BadgeCheck className="size-4 shrink-0 text-accent" aria-label="Verified store" />
              )}
            </h3>
            <p className="truncate text-xs text-muted-foreground">{store.categoryName}</p>
          </div>
          <StatusBadge status={store.status} className="shrink-0" />
        </div>

        <Rating value={store.rating} reviewCount={store.reviewCount} className="mt-3" />

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{store.description}</p>

        <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <StoreIcon className="size-4 text-primary" aria-hidden="true" />
          {store.productCount} products
          <span className="ml-auto">{store.location}</span>
        </div>
      </div>
    </article>
  );
}
