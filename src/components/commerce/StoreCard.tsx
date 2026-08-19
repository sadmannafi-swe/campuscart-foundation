import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import type { Store } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StoreCard({ store, className }: { store: Store; className?: string }) {
  return (
    <article
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      <div
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-sm font-extrabold text-primary",
          store.accentFrom,
          store.accentTo,
        )}
      >
        {store.initials}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="flex min-w-0 items-center gap-1 text-[13px] font-bold">
          <Link
            to="/stores/$storeSlug"
            params={{ storeSlug: store.slug }}
            className="min-w-0 truncate"
          >
            <span className="absolute inset-0" aria-hidden="true" />
            {store.name}
          </Link>
          {store.verified && (
            <BadgeCheck className="size-3.5 shrink-0 text-accent" aria-label="Verified store" />
          )}
        </h3>
        <p className="truncate text-[11px] text-muted-foreground">
          {store.categoryName} · {store.productCount} products
        </p>
      </div>

      <span className="shrink-0 text-[11px] font-semibold text-warning">
        ★ {store.rating.toFixed(1)}
      </span>
    </article>
  );
}
