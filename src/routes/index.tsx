import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Store } from "lucide-react";
import { BrandImage } from "@/components/brand/BrandImage";
import { BloomMark } from "@/components/brand/BloomMark";
import { CampusRouteMap, type MapListing } from "@/components/brand/CampusRouteMap";
import { Reveal, RiseWords } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { campuses } from "@/data/campuses";
import { products as sampleProducts } from "@/data/marketplace";
import { useLiveProducts } from "@/lib/liveCatalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusCart — Choose Your University Marketplace" },
      {
        name: "description",
        content:
          "Pick your university and buy, sell and discover products from your campus community on CampusCart.",
      },
      { property: "og:title", content: "CampusCart — Choose Your University Marketplace" },
      {
        property: "og:description",
        content: "University marketplaces for DIU, NSU, BRAC, DU and EWU.",
      },
    ],
  }),
  component: CampusSelectorPage,
});

/** Shown on the map only until real listings exist. */
const exampleListings: MapListing[] = [
  { name: "Data Structures note pack", price: 420, categorySlug: "textbooks" },
  { name: "Scientific calculator FX-991", price: 1650, categorySlug: "electronics" },
  { name: "Homemade lunch box", price: 220, categorySlug: "food" },
  { name: "Engineering drawing kit", price: 890, categorySlug: "stationery" },
];

function CampusSelectorPage() {
  const { data: live = [] } = useLiveProducts();
  const real = [...live, ...sampleProducts];
  const listings: MapListing[] =
    real.length >= 4
      ? real
          .slice(0, 4)
          .map((p) => ({ name: p.name, price: p.price, categorySlug: p.categorySlug }))
      : exampleListings;

  const liveCampus = campuses.find((c) => c.status === "live");
  const others = campuses.filter((c) => c.status !== "live");

  return (
    <div className="min-h-screen bg-background">
      {/* quiet top bar */}
      <header className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2" aria-label="CampusCart home">
          <BloomMark className="size-8" animate />
          <span className="font-display text-[19px] font-semibold tracking-[-0.02em]">
            CampusCart
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/sell"
            className="hidden rounded-[10px] px-3 py-2 text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Sell on CampusCart
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-[10px] px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create account
            </Link>
          </Button>
        </nav>
      </header>

      {/* hero: headline on the left, the campus walk on the right */}
      <section className="container-page grid items-center gap-10 pb-16 pt-8 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:pb-20 lg:pt-4">
        <div className="max-w-xl">
          <p
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-2 pr-3 text-xs text-muted-foreground animate-rise"
            style={{ animationDelay: "60ms" }}
          >
            <span className="relative grid size-2 place-items-center">
              <span
                className="absolute inset-0 rounded-full bg-accent"
                style={{ animation: "cc-live 1800ms ease-out infinite" }}
              />
              <span className="size-2 rounded-full bg-accent" />
            </span>
            Live at DIU · four more campuses opening
          </p>

          <h1 className="display-xl mt-6 text-balance">
            <RiseWords text="Everything your campus sells," start={120} />{" "}
            <span className="relative inline-block">
              <RiseWords text="one walk away" start={480} />
              <svg
                viewBox="0 0 300 14"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-3 w-full"
                aria-hidden="true"
              >
                <path
                  d="M3 9 C 80 3, 200 3, 297 7"
                  fill="none"
                  stroke="var(--color-bloom)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="320"
                  strokeDashoffset="320"
                  style={{ animation: "cc-draw 900ms var(--ease-bloom) 1000ms forwards" }}
                />
              </svg>
            </span>
          </h1>

          <p
            className="mt-6 max-w-md text-[17px] leading-relaxed text-muted-foreground animate-rise"
            style={{ animationDelay: "700ms" }}
          >
            Textbooks, gadgets, hostel gear and student services from verified students at your
            university. Pay on delivery, or pick it up between classes.
          </p>

          <div
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 animate-rise"
            style={{ animationDelay: "820ms" }}
          >
            {liveCampus?.path && (
              <Button asChild size="lg" className="group">
                <Link to={liveCampus.path}>
                  Enter DIU marketplace
                  <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            )}
            <a
              href="#campuses"
              className="text-[15px] font-medium text-foreground underline decoration-bloom decoration-2 underline-offset-[6px] transition-colors hover:decoration-bloom-ink"
            >
              See all universities
            </a>
          </div>
        </div>

        <div className="animate-rise" style={{ animationDelay: "240ms" }}>
          <CampusRouteMap listings={listings} />
        </div>
      </section>

      {/* university picker */}
      <section id="campuses" className="scroll-mt-8 border-t border-border bg-surface">
        <div className="container-page py-16 lg:py-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display-lg">Choose your university</h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Each campus is its own marketplace. Students sell to students they share a campus
                with.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {liveCampus && (
              <Reveal delay={80}>
                <LiveCampusCard campus={liveCampus} />
              </Reveal>
            )}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {others.map((campus, i) => (
                <Reveal
                  as="li"
                  key={campus.slug}
                  delay={140 + i * 70}
                  className={cn(i === 0 && others.length % 2 === 1 && "sm:col-span-2")}
                >
                  <SoonCampusCard campus={campus} />
                </Reveal>
              ))}
            </ul>
          </div>

          <Reveal delay={120}>
            <Link
              to="/sell"
              className="group mt-4 flex items-center gap-4 rounded-[20px] border border-border bg-background p-5 transition-colors hover:border-foreground/20"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-bloom-soft text-bloom-ink">
                <Store className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-semibold">
                  Open a store on CampusCart
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Register with your university and student ID, then list your first product
                </span>
              </span>
              <ArrowUpRight
                className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="container-page flex flex-wrap items-center justify-between gap-3 py-8 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <BloomMark className="size-5" /> CampusCart · Your campus. Your marketplace.
        </span>
        <span>Built for university students in Bangladesh</span>
      </footer>
    </div>
  );
}

function CampusLogo({
  campus,
  className,
}: {
  campus: (typeof campuses)[number];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-[14px] bg-surface",
        className,
      )}
    >
      <BrandImage
        fallback={campus.shortName}
        src={campus.logo}
        alt={`${campus.name} logo`}
        className="size-full object-contain p-1 text-sm"
        width={64}
        height={64}
      />
    </span>
  );
}

function LiveCampusCard({ campus }: { campus: (typeof campuses)[number] }) {
  return (
    <Link
      to={campus.path ?? "/diu"}
      className="group relative flex h-full min-h-64 flex-col justify-between overflow-hidden rounded-[24px] bg-ink p-6 text-ink-foreground transition-transform duration-300 ease-[var(--ease-bloom)] hover:-translate-y-1 sm:p-8"
    >
      {/* a field of daffodils that opens when you hover */}
      <span
        className="pointer-events-none absolute -bottom-10 -right-10 flex gap-2 opacity-90"
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <BloomMark
            key={i}
            className={cn(
              "transition-transform duration-500 ease-[var(--ease-bloom)] group-hover:rotate-[30deg]",
              i === 0 && "size-24 translate-y-6",
              i === 1 && "size-36 group-hover:scale-110",
              i === 2 && "size-20 translate-y-10",
            )}
          />
        ))}
      </span>

      <div className="relative flex items-start justify-between gap-4">
        <CampusLogo campus={campus} className="size-14" />
        <span className="inline-flex items-center gap-2 rounded-full bg-ink-foreground/10 px-3 py-1 text-xs">
          <span className="size-1.5 rounded-full bg-bloom" /> Live now
        </span>
      </div>
      <div className="relative mt-10 max-w-sm">
        <p className="text-sm text-ink-foreground/70">{campus.tagline}</p>
        <p className="mt-1 font-display text-3xl font-semibold tracking-[-0.02em]">
          DIU CampusCart
        </p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-bloom">
          Enter the marketplace
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

function SoonCampusCard({ campus }: { campus: (typeof campuses)[number] }) {
  return (
    <Link
      to="/campus/$campusSlug"
      params={{ campusSlug: campus.slug }}
      className="flex h-full items-center gap-3 rounded-[18px] border border-border bg-background p-4 transition-colors hover:border-foreground/20 hover:bg-surface"
    >
      <CampusLogo campus={campus} className="size-11 border border-border" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-tight">
          {campus.name.replace(" CampusCart", "")}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {campus.tagline} · Opening soon
        </span>
      </span>
    </Link>
  );
}
