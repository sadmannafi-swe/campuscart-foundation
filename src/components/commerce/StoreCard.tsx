import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import type { Store } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StoreCard({ store, className }: { store: Store; className?: string }) {
  return (
    <article
      className={cn(
        "group relative flex items-center gap-3 rounded-[16px] border border-border bg-surface p-3 transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-bloom)] hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      <div className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-ink font-display text-sm font-semibold text-ink-foreground transition-colors duration-300 group-hover:bg-bloom group-hover:text-bloom-foreground">
        {store.initials}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="flex min-w-0 items-center gap-1 text-sm font-medium">
          <Link
            to="/stores/$storeSlug"
            params={{ storeSlug: store.slug }}
            className="min-w-0 truncate"
          >
            <span className="absolute inset-0" aria-hidden="true" />
            {store.name}
          </Link>
          {store.verified && (
            <BadgeCheck className="size-4 shrink-0 text-accent" aria-label="Verified store" />
          )}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {store.categoryName} · <span className="tabular-nums">{store.productCount}</span> products
        </p>
      </div>

      <span className="shrink-0 text-xs tabular-nums">
        <span className="text-bloom-ink">★</span> {store.rating.toFixed(1)}
      </span>
    </article>
  );
}
