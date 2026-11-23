import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, Store as StoreIcon } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ProductRail } from "@/components/commerce/ProductRail";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { StoreCard } from "@/components/commerce/StoreCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/StateBlocks";
import { useFeaturedLiveStores, useLiveProducts, useLiveStores } from "@/lib/liveCatalog";
import { products, getFeaturedStores, getProductsByTag } from "@/data/marketplace";
import { setMarketplace } from "@/lib/marketplace";
import { Reveal, RiseWords } from "@/components/motion/Reveal";
import { BloomMark } from "@/components/brand/BloomMark";
import { useCountUp } from "@/lib/motion";
import { formatPrice } from "@/lib/format";
import { categories } from "@/data/categories";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/diu")({
  head: () => ({
    meta: [
      { title: "DIU CampusCart — Your Campus. Your Marketplace." },
      {
        name: "description",
        content:
          "Buy and sell textbooks, electronics, hostel essentials and student services from verified DIU campus stores.",
      },
      { property: "og:title", content: "DIU CampusCart — Your Campus. Your Marketplace." },
      {
        property: "og:description",
        content:
          "The multi-vendor marketplace built for Daffodil International University students.",
      },
    ],
  }),
  component: HomePage,
});

const tabs = [
  { id: "recommended", label: "Recommended" },
  { id: "new", label: "New arrivals" },
] as const;

function HomePage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("recommended");
  // Entering the DIU marketplace selects it for catalogue, chat and checkout.
  useEffect(() => setMarketplace("diu"), []);
  const { data: allLive = [], isLoading: loadingLive } = useLiveProducts();
  // only this marketplace's seller listings
  const live = allLive.filter((p) => p.universitySlug === "diu");
  const liveDeals = live.filter((p) => p.originalPrice !== undefined && p.originalPrice > p.price);
  const flashDeals = [...liveDeals, ...getProductsByTag("offer")].slice(0, 6);
  const { stores: diuStores } = useLiveStores();
  const topRatedStores = [...diuStores]
    .sort((a, b) => b.rating - a.rating || b.productCount - a.productCount)
    .slice(0, 4);
  const sampleFeatured = getFeaturedStores();
  const { data: featuredStores = [] } = useFeaturedLiveStores("diu");
  const featuredLive = live.filter((p) => p.featuredIn === "diu");
  const recommended = [
    ...featuredLive,
    ...live.filter((p) => p.featuredIn !== "diu"),
    ...[...products].sort((a, b) => b.rating - a.rating),
  ];
  const newArrivals = [...live, ...getProductsByTag("new")];
  const tabProducts = activeTab === "recommended" ? recommended : newArrivals;
  const listingCount = live.length + products.length;
  const tabIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <SiteLayout>
      {/* Hero: the campus in daylight, with the marketplace's real numbers */}
      <section className="container-page pt-4 sm:pt-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative isolate overflow-hidden rounded-[28px] bg-ink text-ink-foreground">
            <img
              src={heroImage}
              alt=""
              aria-hidden="true"
              className="absolute right-0 top-0 -z-10 h-60 w-full object-cover sm:inset-y-0 sm:h-full sm:w-[62%]"
              style={{ animation: "cc-rise 1200ms var(--ease-bloom) both" }}
            />
            <span
              className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--color-ink)_0%,var(--color-ink)_38%,transparent_78%)] max-sm:bg-[linear-gradient(0deg,var(--color-ink)_0%,var(--color-ink)_62%,transparent_80%)]"
              aria-hidden="true"
            />
            <BloomMark className="absolute -left-10 -top-10 -z-10 size-40 opacity-15" animate />

            <div className="flex max-w-xl flex-col justify-end px-6 pb-7 pt-52 sm:min-h-[460px] sm:justify-center sm:px-10 sm:py-12">
              <p className="text-sm text-ink-foreground/70 animate-rise">
                Daffodil International University
              </p>
              <h1 className="mt-3 font-display text-[clamp(2.25rem,1.6rem+2.8vw,3.75rem)] font-semibold leading-[1] tracking-[-0.035em]">
                <RiseWords text="Shop smart." start={100} />{" "}
                <span className="text-bloom">
                  <RiseWords text="Support local." start={300} />
                </span>
              </h1>
              <p
                className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-foreground/75 animate-rise"
                style={{ animationDelay: "500ms" }}
              >
                Buy from verified DIU sellers and get the best campus deals, delivered or picked up
                on campus.
              </p>
              <div
                className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 animate-rise"
                style={{ animationDelay: "620ms" }}
              >
                <Button asChild size="lg" variant="bloom" className="group">
                  <Link to="/products" search={{}}>
                    Shop now
                    <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Link
                  to="/sell"
                  className="text-sm font-medium text-ink-foreground/85 underline decoration-ink-foreground/30 underline-offset-4 transition-colors hover:text-ink-foreground hover:decoration-bloom"
                >
                  Open a store
                </Link>
              </div>

              <dl
                className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-ink-foreground/15 pt-5 animate-rise"
                style={{ animationDelay: "760ms" }}
              >
                <Stat label="Listings" value={listingCount} />
                <Stat label="Verified stores" value={diuStores.length} />
                <Stat label="Categories" value={categories.length} />
              </dl>
            </div>
          </div>

          <div className="hidden rounded-[28px] border border-border bg-surface p-5 lg:flex lg:flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Top rated stores</h2>
              <Link
                to="/stores"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View all
              </Link>
            </div>
            <ul className="flex flex-1 flex-col gap-1">
              {topRatedStores.length === 0 && (
                <li className="px-1 py-1.5 text-sm text-muted-foreground">
                  Verified campus stores will appear here.
                </li>
              )}
              {topRatedStores.map((store, i) => (
                <li
                  key={store.id}
                  className="animate-rise"
                  style={{ animationDelay: `${300 + i * 90}ms` }}
                >
                  <Link
                    to="/stores/$storeSlug"
                    params={{ storeSlug: store.slug }}
                    className="group flex items-center gap-3 rounded-[14px] p-2 transition-colors hover:bg-muted"
                  >
                    <span className="w-4 text-center font-display text-sm tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-ink font-display text-xs font-semibold text-ink-foreground transition-colors duration-300 group-hover:bg-bloom group-hover:text-bloom-foreground">
                      {store.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{store.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {store.categoryName}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums">
                      <span className="text-bloom-ink">★</span> {store.rating.toFixed(1)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/sell"
              className="mt-4 flex items-center justify-between rounded-[14px] bg-bloom-soft px-4 py-3 text-sm font-medium transition-colors hover:bg-bloom/40"
            >
              Sell to DIU students
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Just listed: a slow ticker of real listings on campus */}
      {newArrivals.length > 0 && <ListedTicker products={newArrivals.slice(0, 12)} />}

      {/* Daily flash deals */}
      {flashDeals.length > 0 && (
        <section className="container-page pt-10">
          <SectionHeader
            eyebrow="Limited-time student prices"
            title="Daily flash deals"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/offers">
                  View all <ArrowRight />
                </Link>
              </Button>
            }
          />
          <ProductRail products={flashDeals} />
        </section>
      )}

      {/* Featured stores */}
      <section className="container-page pt-12">
        <SectionHeader title="Featured stores" description="Picked by the DIU CampusCart team" />
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {featuredStores.map((s, i) => (
            <Reveal key={s.id} delay={i * 70} className="snap-start">
              <Link
                to="/stores/$storeSlug"
                params={{ storeSlug: s.id }}
                className="group flex w-72 shrink-0 items-center gap-3 rounded-[16px] border border-border bg-surface p-3 transition-[transform,box-shadow] duration-300 ease-[var(--ease-bloom)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-ink text-ink-foreground transition-colors duration-300 group-hover:bg-bloom group-hover:text-bloom-foreground">
                  <StoreIcon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-medium">
                    <span className="truncate">{s.name}</span>
                    <BadgeCheck
                      className="size-4 shrink-0 text-accent"
                      aria-label="Featured store"
                    />
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{s.category}</span>
                </span>
              </Link>
            </Reveal>
          ))}
          {featuredStores.length === 0 && sampleFeatured.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">
              Featured campus stores will appear here soon.
            </p>
          )}
          {sampleFeatured.map((store, i) => (
            <Reveal key={store.id} delay={i * 70} className="snap-start">
              <StoreCard store={store} className="w-72 shrink-0" />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Recommended / New arrivals tabs */}
      <section className="container-page pb-16 pt-12">
        <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
            For you at DIU
          </h2>
          <div
            role="tablist"
            aria-label="Product lists"
            className="relative grid grid-cols-2 rounded-full border border-border bg-surface p-1"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-ink transition-transform duration-500 ease-[var(--ease-bloom)]"
              style={{ transform: `translateX(${tabIndex * 100}%)` }}
            />
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                onClick={() => setActiveTab(tab.id)}
                aria-selected={activeTab === tab.id}
                className={cn(
                  "relative z-10 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-300",
                  activeTab === tab.id
                    ? "text-ink-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Reveal>
        {tabProducts.length === 0 && !loadingLive ? (
          <EmptyState
            title="No listings yet"
            description="Products from verified DIU sellers will show up here as soon as they're published."
            action={
              <Button asChild size="sm">
                <Link to="/sell">Start selling</Link>
              </Button>
            }
          />
        ) : (
          <ProductGrid key={activeTab} products={tabProducts} />
        )}
      </section>
    </SiteLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const { ref, display } = useCountUp(value);
  return (
    <div>
      <dt className="text-xs text-ink-foreground/60">{label}</dt>
      <dd
        ref={ref as React.Ref<HTMLElement>}
        className="mt-1 font-display text-2xl font-semibold tabular-nums"
      >
        {display}
      </dd>
    </div>
  );
}

function ListedTicker({ products: items }: { products: Product[] }) {
  const loop = [...items, ...items];
  return (
    <section
      aria-label="Just listed on campus"
      className="mt-6 overflow-hidden border-y border-border bg-surface py-3"
    >
      <div className="group flex">
        <div
          data-marquee=""
          className="flex shrink-0 gap-8 pr-8 group-hover:[animation-play-state:paused]"
          style={{ animation: `cc-marquee ${items.length * 4}s linear infinite` }}
        >
          {loop.map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              to="/products/$productSlug"
              params={{ productSlug: p.slug }}
              aria-hidden={i >= items.length ? true : undefined}
              tabIndex={i >= items.length ? -1 : undefined}
              className="flex shrink-0 items-center gap-2 text-sm transition-colors hover:text-foreground"
            >
              <BloomMark className="size-4" />
              <span className="text-muted-foreground">Just listed</span>
              <span className="font-medium">{p.name}</span>
              <span className="tabular-nums text-muted-foreground">{formatPrice(p.price)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
