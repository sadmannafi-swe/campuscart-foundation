import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Home, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { BASHA_FACILITY_KEYS, BASHA_TYPE_LABELS, BASHA_TYPES } from "@shared/types";
import { UNIVERSITIES } from "@shared/universities";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EmptyState } from "@/components/common/StateBlocks";
import { ModuleHeader, accent } from "@/components/modules/ModuleKit";
import { BashaCard, FACILITY_META } from "@/components/modules/basha/BashaKit";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplace } from "@/lib/marketplace";
import { useBashaListings } from "@/lib/modules";
import { cn } from "@/lib/utils";

type Search = {
  q?: string | undefined;
  university?: string | undefined;
  type?: string | undefined;
  min?: string | undefined;
  max?: string | undefined;
  available_by?: string | undefined;
  facilities?: string | undefined;
  sort?: string | undefined;
};
const str = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 80) : undefined);

export const Route = createFileRoute("/basha/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: str(s["q"]),
    university: str(s["university"]),
    type: str(s["type"]),
    min: str(s["min"]),
    max: str(s["max"]),
    available_by: str(s["available_by"]),
    facilities: str(s["facilities"]),
    sort: str(s["sort"]),
  }),
  head: () => ({
    meta: [
      { title: "BashaLagbe — rooms and roommates near campus — CampusCart" },
      {
        name: "description",
        content: "Find single rooms, shared rooms, roommates and apartments near your university.",
      },
    ],
  }),
  component: BashaBrowse,
});

const field =
  "h-9 rounded-[10px] border border-input bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function BashaBrowse() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/basha/" });
  const marketplace = useMarketplace();
  const { data: listings = [], isLoading, isError } = useBashaListings(search);
  const [q, setQ] = useState(search.q ?? "");
  const [min, setMin] = useState(search.min ?? "");
  const [max, setMax] = useState(search.max ?? "");
  const [by, setBy] = useState(search.available_by ?? "");
  const [open, setOpen] = useState(false);
  const wanted = (search.facilities ?? "").split(",").filter(Boolean);

  const set = (patch: Partial<Search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const apply = (e?: FormEvent) => {
    e?.preventDefault();
    set({
      q: q.trim() || undefined,
      min: min || undefined,
      max: max || undefined,
      available_by: by || undefined,
    });
  };
  const toggleFacility = (k: string) => {
    const next = wanted.includes(k) ? wanted.filter((w) => w !== k) : [...wanted, k];
    set({ facilities: next.join(",") || undefined });
  };
  const activeCount = [search.min, search.max, search.available_by, search.facilities].filter(
    Boolean,
  ).length;

  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <ModuleHeader
          tone="basha"
          icon={Home}
          eyebrow="Housing near campus"
          title="BashaLagbe"
          description="Single rooms, roommates and full apartments, listed by students and owners."
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/account/basha">My listings</Link>
              </Button>
              <Button asChild className={accent.basha.button}>
                <Link to="/basha/new">
                  <Plus /> List a place
                </Link>
              </Button>
            </>
          }
        />

        <form onSubmit={apply} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by area or location"
              aria-label="Search by area"
              className="h-10 pl-9"
            />
          </div>
          <select
            aria-label="University"
            className={cn(field, "h-10")}
            value={search.university ?? marketplace}
            onChange={(e) =>
              set({ university: e.target.value === marketplace ? undefined : e.target.value })
            }
          >
            {UNIVERSITIES.map((u) => (
              <option key={u.slug} value={u.slug}>
                Near {u.short_name}
              </option>
            ))}
          </select>
          <Button type="submit" className="h-10">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <SlidersHorizontal /> Filters
            {activeCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-basha text-[11px] text-white">
                {activeCount}
              </span>
            )}
          </Button>
        </form>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {[undefined, ...BASHA_TYPES].map((t) => (
            <button
              key={t ?? "all"}
              type="button"
              onClick={() => set({ type: t })}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                search.type === t
                  ? "border-basha/40 bg-basha-soft text-basha"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {t ? BASHA_TYPE_LABELS[t] : "All types"}
            </button>
          ))}
        </div>

        {open && (
          <form onSubmit={apply} className="card-surface mt-3 space-y-4 p-4 animate-rise">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-muted-foreground">
                Min rent (৳)
                <Input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Max rent (৳)
                <Input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Available by
                <Input type="date" value={by} onChange={(e) => setBy(e.target.value)} />
              </label>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Must have</p>
              <div className="flex flex-wrap gap-2">
                {BASHA_FACILITY_KEYS.map((k) => {
                  const { icon: Icon, label } = FACILITY_META[k];
                  const on = wanted.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleFacility(k)}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                        on
                          ? "border-basha bg-basha text-white"
                          : "border-border bg-surface hover:bg-basha-soft",
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden="true" /> {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMin("");
                  setMax("");
                  setBy("");
                  void navigate({
                    search: { q: search.q, university: search.university },
                    replace: true,
                  });
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
              : `${listings.length} ${listings.length === 1 ? "place" : "places"}`}
          </p>
          <select
            aria-label="Sort"
            className={field}
            value={search.sort ?? ""}
            onChange={(e) => set({ sort: e.target.value || undefined })}
          >
            <option value="">Newest</option>
            <option value="rent_asc">Rent: Low to High</option>
            <option value="rent_desc">Rent: High to Low</option>
          </select>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-[18px]" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              title="Couldn't load BashaLagbe"
              description="Check your connection and try again."
            />
          ) : listings.length === 0 ? (
            <EmptyState
              title="No places match"
              description="Try another area, type or rent range."
              action={
                <Button asChild size="sm" className={accent.basha.button}>
                  <Link to="/basha/new">List a place</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l, i) => (
                <Reveal key={l.id} delay={(i % 3) * 70} className="h-full">
                  <BashaCard l={l} className="h-full" />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
