import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Store as StoreIcon, Truck } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeader } from "@/components/common/SectionHeader";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { StoreCard } from "@/components/commerce/StoreCard";
import { Button } from "@/components/ui/button";
import {
  categories,
  getFeaturedStores,
  getProductsByTag,
  getTopRatedStores,
  products,
} from "@/data/marketplace";

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
        content: "The multi-vendor marketplace built for Daffodil International University students.",
      },
    ],
  }),
  component: HomePage,
});

const perks = [
  { icon: ShieldCheck, title: "Verified sellers", text: "Every store is reviewed by the campus team." },
  { icon: Truck, title: "Same-day pickup", text: "Collect from your building or hall gate." },
  { icon: StoreIcon, title: "Student pricing", text: "Deals negotiated for DIU students only." },
];

function HomePage() {
  const featured = getProductsByTag("featured");
  const trending = getProductsByTag("trending").slice(0, 4);
  const newArrivals = getProductsByTag("new").slice(0, 4);
  const offers = getProductsByTag("offer").slice(0, 4);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="container-page grid gap-10 py-10 lg:grid-cols-2 lg:items-center lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              {products.length}+ live listings · {categories.length} categories
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              Everything campus life needs,{" "}
              <span className="text-primary">from students you trust</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              DIU CampusCart brings verified student stores, department merch, textbooks and
              services into one clean marketplace. Your Campus. Your Marketplace.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/products">
                  Start shopping <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/stores">Explore stores</Link>
              </Button>
            </div>
            <dl className="mt-9 grid grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                { label: "Active stores", value: "120+" },
                { label: "Student buyers", value: "8.4k" },
                { label: "Avg. rating", value: "4.7" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                  <dd className="price-lg text-xl text-primary">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <img
              src={heroImage}
              alt="DIU students exchanging books, a laptop and headphones on campus"
              width={1280}
              height={960}
              className="aspect-4/3 w-full rounded-3xl object-cover shadow-[var(--shadow-card-hover)]"
            />
            <div className="card-surface absolute -bottom-5 left-4 hidden items-center gap-3 px-4 py-3 sm:flex">
              <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
                <ShieldCheck className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">Moderated listings</p>
                <p className="text-xs text-muted-foreground">Reviewed before going live</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="container-page grid gap-4 py-8 sm:grid-cols-3">
        {perks.map((perk) => (
          <div key={perk.title} className="card-surface flex items-start gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <perk.icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{perk.title}</p>
              <p className="text-xs text-muted-foreground">{perk.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section className="container-page py-8">
        <SectionHeader
          eyebrow="Browse"
          title="Popular categories"
          description="Jump straight into what students shop for most."
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to="/products"
              search={{ category: category.slug, q: undefined, sort: undefined }}
              className="card-surface flex items-center gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-card-hover)]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <CategoryIcon name={category.icon} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{category.name}</span>
                <span className="text-xs text-muted-foreground">{category.productCount} items</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured stores */}
      <section className="container-page py-8">
        <SectionHeader
          eyebrow="Vendors"
          title="Featured stores"
          description="Highly rated student-run shops on campus."
          action={
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/stores">
                All stores <ArrowRight />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {getFeaturedStores().map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="container-page py-8">
        <SectionHeader
          eyebrow="Handpicked"
          title="Featured products"
          action={
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/products">
                View all <ArrowRight />
              </Link>
            </Button>
          }
        />
        <ProductGrid products={featured.slice(0, 4)} />
      </section>

      {/* Trending */}
      <section className="container-page py-8">
        <SectionHeader eyebrow="Hot right now" title="Trending this week" />
        <ProductGrid products={trending} />
      </section>

      {/* Promotional */}
      <section className="container-page py-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-primary px-6 py-10 text-primary-foreground sm:px-10">
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">
                Semester start offer
              </span>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Up to 40% off textbook bundles & hostel kits
              </h2>
              <p className="mt-2 max-w-xl text-sm opacity-90">
                Fresh deals from verified campus stores, live until the add/drop week ends.
              </p>
            </div>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/offers">See all offers</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-page py-8">
        <SectionHeader
          eyebrow="Just listed"
          title="New arrivals"
          action={
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/new-arrivals">
                View all <ArrowRight />
              </Link>
            </Button>
          }
        />
        <ProductGrid products={newArrivals} />
      </section>

      {/* Offers */}
      <section className="container-page py-8">
        <SectionHeader eyebrow="Save more" title="Best student deals" />
        <ProductGrid products={offers} />
      </section>

      {/* Top rated stores */}
      <section className="container-page py-8">
        <SectionHeader eyebrow="Trusted" title="Top-rated stores" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {getTopRatedStores().map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
