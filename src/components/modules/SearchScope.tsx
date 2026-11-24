import { Link } from "@tanstack/react-router";
import { ShoppingBag, Store } from "lucide-react";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { EmptyState } from "@/components/common/StateBlocks";
import { PreOwnedCard } from "@/components/modules/preowned/PreOwnedCard";
import { Reveal } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { liveProductFromApi } from "@/lib/liveCatalog";
import { useScopedSearch, type SearchScope } from "@/lib/modules";
import { cn } from "@/lib/utils";

const scopes: { id: SearchScope; label: string }[] = [
  { id: "marketplace", label: "Marketplace" },
  { id: "preowned", label: "Pre-Owned" },
  { id: "all", label: "All" },
];

/** Where to search. Marketplace is the default; Pre-Owned is never mixed in unless asked. */
export function SearchScopeTabs({
  value,
  onChange,
}: {
  value: SearchScope;
  onChange: (scope: SearchScope) => void;
}) {
  const index = scopes.findIndex((s) => s.id === value);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <span className="text-xs text-muted-foreground">Search in</span>
      <div
        role="tablist"
        aria-label="Search scope"
        className="relative grid grid-cols-3 rounded-full border border-border bg-surface p-1"
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full transition-[transform,background-color] duration-500 ease-[var(--ease-bloom)]",
            value === "preowned" ? "bg-preowned" : "bg-ink",
          )}
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {scopes.map((s) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={value === s.id}
            onClick={() => onChange(s.id)}
            className={cn(
              "relative z-10 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              value === s.id ? "text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SourceHeading({
  icon: Icon,
  label,
  count,
  tone,
}: {
  icon: typeof Store;
  label: string;
  count: number;
  tone: "ink" | "preowned";
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
      <span
        className={cn(
          "grid size-8 place-items-center rounded-[10px]",
          tone === "preowned" ? "bg-preowned-soft text-preowned" : "bg-ink text-ink-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      {label}
      <span className="text-sm font-normal text-muted-foreground">{count}</span>
    </h2>
  );
}

/** Results for the Pre-Owned and All scopes, from the server's scoped search. */
export function ScopedResults({
  q,
  scope,
}: {
  q: string;
  scope: Exclude<SearchScope, "marketplace">;
}) {
  const { data, isLoading, isError } = useScopedSearch(q, scope, !!q);
  if (isLoading) {
    return (
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-[16px]" />
        ))}
      </div>
    );
  }
  if (isError || !data)
    return (
      <EmptyState className="mt-5" title="Search didn't work" description="Please try again." />
    );
  const products = data.marketplace.map((p) => liveProductFromApi(p));

  const preowned = (
    <section>
      {scope === "all" && (
        <SourceHeading
          icon={ShoppingBag}
          label="Pre-Owned"
          count={data.preowned.length}
          tone="preowned"
        />
      )}
      {data.preowned.length === 0 ? (
        <EmptyState
          title="No Pre-Owned items match"
          action={
            <Link
              to="/preowned"
              className="text-sm underline decoration-preowned underline-offset-4"
            >
              Browse Pre-Owned
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {data.preowned.map((l, i) => (
            <Reveal key={l.id} delay={(i % 5) * 60} className="h-full">
              <PreOwnedCard listing={l} className="h-full" />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="mt-5 space-y-10">
      {scope === "all" && (
        <section>
          <SourceHeading icon={Store} label="Marketplace" count={products.length} tone="ink" />
          {products.length === 0 ? (
            <EmptyState title="No Marketplace products match" />
          ) : (
            <ProductGrid products={products} />
          )}
        </section>
      )}
      {preowned}
    </div>
  );
}
