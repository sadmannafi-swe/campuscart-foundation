import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { PREOWNED_CATEGORIES, PREOWNED_CONDITION_LABELS, PREOWNED_CONDITIONS } from "@shared/types";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ModuleHeader, accent } from "@/components/modules/ModuleKit";
import { PreOwnedCard } from "@/components/modules/preowned/PreOwnedCard";
import { EmptyState } from "@/components/common/StateBlocks";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreOwnedListings, type PreOwnedFilters } from "@/lib/modules";
import { cn } from "@/lib/utils";

const str = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 80) : undefined);

export const Route = createFileRoute("/preowned/")({
  validateSearch: (s: Record<string, unknown>): PreOwnedFilters => ({
    q: str(s["q"]),
    category: str(s["category"]),
    condition: str(s["condition"]),
    location: str(s["location"]),
    min: str(s["min"]),
    max: str(s["max"]),
    status: str(s["status"]),
    sort: str(s["sort"]),
  }),
  head: () => ({
    meta: [
      { title: "Pre-Owned — CampusCart" },
      {
        name: "description",
        content: "Buy and sell used and unused items with students on your campus.",
      },
    ],
  }),
  component: PreOwnedBrowse,
});

const field =
  "h-9 rounded-[10px] border border-input bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function PreOwnedBrowse() {
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/preowned/" });
  const { data: listings = [], isLoading, isError } = usePreOwnedListings(filters);
  const [q, setQ] = useState(filters.q ?? "");
  const [location, setLocation] = useState(filters.location ?? "");
  const [min, setMin] = useState(filters.min ?? "");
  const [max, setMax] = useState(filters.max ?? "");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => setQ(filters.q ?? ""), [filters.q]);

  const set = (patch: Partial<PreOwnedFilters>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  function applyText(e?: FormEvent) {
    e?.preventDefault();
    set({
      q: q.trim() || undefined,
      location: location.trim() || undefined,
      min: min || undefined,
      max: max || undefined,
    });
  }

  const active = [
    filters.category,
    filters.condition,
    filters.location,
    filters.min,
    filters.max,
    filters.status,
  ].filter(Boolean).length;

  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <ModuleHeader
          tone="preowned"
          icon={ShoppingBag}
          eyebrow="Student to student"
          title="Pre-Owned"
          description="Used and unused things from students on your campus. No store needed to sell."
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/account/preowned">My listings</Link>
              </Button>
              <Button asChild className={accent.preowned.button}>
                <Link to="/preowned/new">
                  <Plus /> Sell an item
                </Link>
              </Button>
            </>
          }
        />

        <form onSubmit={applyText} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Pre-Owned"
              aria-label="Search Pre-Owned"
              className="h-10 pl-9"
            />
          </div>
          <Button type="submit" className="h-10">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((s) => !s)}
          >
            <SlidersHorizontal />
            <span className="hidden sm:inline">Filters</span>
            {active > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-preowned text-[11px] text-white">
                {active}
              </span>
            )}
          </Button>
        </form>

        {/* category chips */}
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {[undefined, ...PREOWNED_CATEGORIES].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              onClick={() => set({ category: c })}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filters.category === c
                  ? "border-preowned/40 bg-preowned-soft text-preowned"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {c ?? "All"}
            </button>
          ))}
        </div>

        {showFilters && (
          <form
            onSubmit={applyText}
            className="card-surface mt-3 grid gap-3 p-4 animate-rise sm:grid-cols-2 lg:grid-cols-5"
          >
            <label className="space-y-1 text-xs text-muted-foreground">
              Condition
              <select
                className={cn(field, "w-full text-foreground")}
                value={filters.condition ?? ""}
                onChange={(e) => set({ condition: e.target.value || undefined })}
              >
                <option value="">Any</option>
                {PREOWNED_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {PREOWNED_CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Location
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Ashulia"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Min price (৳)
              <Input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Max price (৳)
              <Input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Availability
              <select
                className={cn(field, "w-full text-foreground")}
                value={filters.status ?? ""}
                onChange={(e) => set({ status: e.target.value || undefined })}
              >
                <option value="">Available</option>
                <option value="sold">Sold</option>
                <option value="all">All</option>
              </select>
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setLocation("");
                  setMin("");
                  setMax("");
                  void navigate({ search: { q: filters.q }, replace: true });
                }}
              >
                <X /> Clear filters
              </Button>
            </div>
          </form>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isLoading
              ? "Loading…"
              : `${listings.length} ${listings.length === 1 ? "item" : "items"}`}
            {filters.q && <> for “{filters.q}”</>}
          </p>
          <select
            aria-label="Sort"
            className={field}
            value={filters.sort ?? "newest"}
            onChange={(e) =>
              set({ sort: e.target.value === "newest" ? undefined : e.target.value })
            }
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-[16px]" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              title="Couldn't load Pre-Owned"
              description="Check your connection and try again."
            />
          ) : listings.length === 0 ? (
            <EmptyState
              title={filters.q || active ? "Nothing matches" : "No items yet"}
              description={
                filters.q || active
                  ? "Try other words or clear the filters."
                  : "Be the first to sell something you no longer need."
              }
              action={
                <Button asChild size="sm" className={accent.preowned.button}>
                  <Link to="/preowned/new">Sell an item</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {listings.map((l, i) => (
                <Reveal key={l.id} delay={(i % 5) * 60} className="h-full">
                  <PreOwnedCard listing={l} className="h-full" />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
