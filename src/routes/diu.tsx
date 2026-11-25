import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { BadgeCheck, Store as StoreIcon } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ShortcutTiles } from "@/components/home/ShortcutTiles";
import { ProductRail } from "@/components/commerce/ProductRail";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/StateBlocks";
import { useFeaturedLiveStores, useLiveProducts } from "@/lib/liveCatalog";
import { setMarketplace } from "@/lib/marketplace";
import { useActiveEvent, type HomeEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

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

const CAMPUS_BANNER = "/brand/diu-campus-banner.jpg";

/**
 * DIU marketplace home, in this order: banner (the admin's active event, or the
 * campus) · four shortcuts · the event's products (only while an event is active) ·
 * featured products · featured stores · all products.
 */
function HomePage() {
  // Entering the DIU marketplace selects it for catalogue, chat and checkout.
  useEffect(() => setMarketplace("diu"), []);
  const { data: event, isLoading: loadingEvent } = useActiveEvent("diu");
  const { data: allLive = [], isLoading: loadingLive } = useLiveProducts();
  const live = allLive.filter((p) => p.universitySlug === "diu");
  const featuredProducts = live.filter((p) => p.featuredIn === "diu");
  const { data: featuredStores = [] } = useFeaturedLiveStores("diu");

  return (
    <SiteLayout>
      <div className="container-page space-y-5 pb-10 pt-3 sm:space-y-6 sm:pt-4">
        <HomeBanner event={event ?? null} loading={loadingEvent} />

        <ShortcutTiles />

        {event && event.products.length > 0 && (
          <HomeSection
            title={event.title}
            action={
              <Link
                to="/events/$eventId"
                params={{ eventId: event.id }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                View event
              </Link>
            }
          >
            <ProductRail products={event.products} />
          </HomeSection>
        )}

        <HomeSection title="Featured Products">
          {featuredProducts.length > 0 ? (
            <ProductRail products={featuredProducts} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {loadingLive ? "Loading…" : "Featured products will appear here."}
            </p>
          )}
        </HomeSection>

        <HomeSection
          title="Featured Stores"
          action={
            <Link
              to="/stores"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              All stores
            </Link>
          }
        >
          {featuredStores.length > 0 ? (
            <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              {featuredStores.map((s) => (
                <Link
                  key={s.id}
                  to="/stores/$storeSlug"
                  params={{ storeSlug: s.id }}
                  className="group flex w-64 shrink-0 snap-start items-center gap-3 rounded-[16px] border border-border bg-surface p-2.5 transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-ink text-ink-foreground transition-colors duration-200 group-hover:bg-bloom group-hover:text-bloom-foreground">
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
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.category}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Featured stores will appear here.</p>
          )}
        </HomeSection>

        <HomeSection
          title="All Products"
          action={
            <Link
              to="/products"
              search={{}}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          }
        >
          {live.length === 0 && !loadingLive ? (
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
            <ProductGrid products={live.slice(0, 24)} />
          )}
        </HomeSection>
      </div>
    </SiteLayout>
  );
}

function HomeSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="truncate font-display text-lg font-semibold tracking-[-0.015em] sm:text-xl">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A small, flag-shaped banner: the active event (links to its page) or the DIU campus. */
function HomeBanner({ event, loading }: { event: HomeEvent | null; loading: boolean }) {
  const frame =
    "hero-banner relative block aspect-[16/5] overflow-hidden rounded-[18px] bg-muted sm:rounded-[22px] lg:aspect-[4/1]";
  if (loading)
    return (
      <div className={cn(frame.replace("hero-banner ", ""), "animate-pulse")} aria-hidden="true" />
    );
  if (!event)
    return (
      <div className={frame}>
        <img
          src={CAMPUS_BANNER}
          alt="Daffodil International University campus"
          className="hero-photo hero-pan size-full object-cover"
          fetchPriority="high"
        />
      </div>
    );
  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className={cn(frame, "group")}
      aria-label={`${event.title} — see the event`}
    >
      <img
        src={event.banner_url}
        alt=""
        className="hero-photo size-full object-cover"
        fetchPriority="high"
      />
    </Link>
  );
}
