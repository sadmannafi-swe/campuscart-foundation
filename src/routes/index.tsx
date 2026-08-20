import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Zap } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SearchBar } from "@/components/layout/SearchBar";
import { ProductRail } from "@/components/commerce/ProductRail";
import { StoreCard } from "@/components/commerce/StoreCard";
import { Button } from "@/components/ui/button";
import { getFeaturedStores, getProductsByTag, getTopRatedStores } from "@/data/marketplace";

export const Route = createFileRoute("/")({
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

function HomePage() {
  const flashDeals = getProductsByTag("offer").slice(0, 6);
  const trending = getProductsByTag("trending").slice(0, 6);
  const newArrivals = getProductsByTag("new").slice(0, 6);

  return (
    <SiteLayout>
      {/* Hero banner + top rated stores */}
      <section className="container-page pt-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="relative overflow-hidden rounded-xl bg-primary">
            <img
              src={heroImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-25"
            />
            <div className="relative max-w-md px-5 py-6 sm:px-7 sm:py-8">
              <h1 className="text-xl font-extrabold leading-tight text-primary-foreground sm:text-2xl">
                Shop Smart. Support Local.
              </h1>
              <p className="mt-1.5 text-xs text-primary-foreground/85 sm:text-sm">
                Buy from verified DIU sellers and get the best campus deals.
              </p>
              <Button size="sm" variant="secondary" asChild className="mt-4">
                <Link to="/products" search={{}}>
                  Shop now
                </Link>
              </Button>
            </div>
          </div>

          <div className="hidden rounded-xl border border-border bg-surface p-3 lg:block">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">Top rated stores</h2>
              <Link to="/stores" className="text-xs font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>
            <ul className="space-y-1.5">
              {getTopRatedStores().map((store) => (
                <li key={store.id}>
                  <Link
                    to="/stores/$storeSlug"
                    params={{ storeSlug: store.slug }}
                    className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-[11px] font-extrabold text-primary">
                      {store.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{store.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {store.categoryName}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-warning">
                      ★ {store.rating.toFixed(1)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Daily flash deals */}
      <section className="container-page pt-6">
        <SectionHeader
          title="Daily Flash Deals"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/offers">
                View all <ArrowRight />
              </Link>
            </Button>
          }
        />
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
          <Zap className="size-3.5" aria-hidden="true" /> Limited-time student prices
        </div>
        <ProductRail products={flashDeals} />
      </section>

      {/* Featured stores */}
      <section className="container-page pt-6">
        <SectionHeader
          title="Featured stores"
          action={
            <Link to="/stores" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          }
        />
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {getFeaturedStores().map((store) => (
            <StoreCard key={store.id} store={store} className="w-64 shrink-0 sm:w-auto" />
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="container-page pt-6">
        <SectionHeader
          title="Trending products"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/products" search={{ sort: "rating" }}>
                View all <ArrowRight />
              </Link>
            </Button>
          }
        />
        <ProductRail products={trending} />
      </section>

      {/* New arrivals */}
      <section className="container-page pb-8 pt-6">
        <SectionHeader
          title="New arrivals"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/new-arrivals">
                View all <ArrowRight />
              </Link>
            </Button>
          }
        />
        <ProductRail products={newArrivals} />
      </section>
    </SiteLayout>
  );
}
