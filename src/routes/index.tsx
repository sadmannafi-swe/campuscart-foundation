import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ArrowRight, Store } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { campuses } from "@/data/campuses";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusCart — Choose Your Campus Marketplace" },
      {
        name: "description",
        content:
          "Pick your university and buy, sell and discover products from your campus community on CampusCart.",
      },
      { property: "og:title", content: "CampusCart — Choose Your Campus Marketplace" },
      {
        property: "og:description",
        content: "University marketplaces for DIU, NSU, BRAC, DU, EWU and more.",
      },
    ],
  }),
  component: CampusSelectorPage,
});

function CampusSelectorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="container-page flex h-14 items-center justify-between gap-2">
          <Logo size="sm" asLink={false} />
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth" search={{ mode: "login" }}>
                Log in
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Create account
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container-page flex-1 py-6 sm:py-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Choose Your Campus</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Buy, sell and discover products from your university community.
          </p>
        </div>

        <ul className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {campuses.map((campus) => {
            const inner = (
              <>
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-soft text-[11px] font-extrabold text-primary">
                  {campus.useBrandLogo ? (
                    <Logo size="sm" asLink={false} className="h-8" />
                  ) : campus.slug === "all-in-one" ? (
                    <Store className="size-5" aria-hidden="true" />
                  ) : campus.slug === "other" ? (
                    <GraduationCap className="size-5" aria-hidden="true" />
                  ) : (
                    campus.shortName
                  )}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-bold">{campus.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {campus.tagline}
                  </span>
                </span>
                {campus.status === "live" ? (
                  <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    Soon
                  </span>
                )}
              </>
            );

            const className =
              "flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/40 hover:bg-muted";

            return (
              <li key={campus.slug}>
                {campus.path ? (
                  <Link to={campus.path} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <Link
                    to="/campus/$campusSlug"
                    params={{ campusSlug: campus.slug }}
                    className={className}
                  >
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="border-t border-border py-5 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} CampusCart — Your Campus. Your Marketplace.
      </footer>
    </div>
  );
}
