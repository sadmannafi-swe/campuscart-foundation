import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, Landmark, School, Building2, GraduationCap, BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { campuses } from "@/data/campuses";

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
        content: "University marketplaces for DIU, NSU, BRAC, DU, EWU and more.",
      },
    ],
  }),
  component: CampusSelectorPage,
});

const campusIcons: Record<string, LucideIcon> = {
  "all-in-one": Globe,
  nsu: School,
  brac: BookOpen,
  du: Landmark,
  ewu: Building2,
  other: Landmark,
};

function CampusSelectorPage() {
  const gridCampuses = campuses.filter((campus) => campus.slug !== "other");
  const other = campuses.find((campus) => campus.slug === "other");

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" asLink={false} />
          <h1 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            Choose your university marketplace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Buy, sell and discover from your campus community.
          </p>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-2.5">
          {gridCampuses.map((campus) => (
            <li key={campus.slug}>
              <CampusCard campus={campus} />
            </li>
          ))}
        </ul>

        {other ? (
          <div className="mt-2.5">
            <CampusCard campus={other} wide />
          </div>
        ) : null}

        <div className="mt-auto pt-8">
          <p className="text-center text-xs text-muted-foreground">Already have an account?</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Button variant="outline" asChild>
              <Link to="/auth" search={{ mode: "login" }}>
                Log in
              </Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Create account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampusCard({
  campus,
  wide = false,
}: {
  campus: (typeof campuses)[number];
  wide?: boolean;
}) {
  const Icon = campusIcons[campus.slug] ?? GraduationCap;

  const content = (
    <>
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl",
          campus.useBrandLogo ? "bg-transparent" : "bg-primary-soft text-primary",
        )}
      >
        {campus.useBrandLogo ? (
          <Logo size="sm" asLink={false} className="h-9" />
        ) : (
          <Icon className="size-5" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold leading-tight">
          {campus.name.replace(" CampusCart", "")}
        </span>
        {campus.name.includes("CampusCart") ? (
          <span className="block text-xs font-semibold leading-tight text-foreground/70">
            CampusCart
          </span>
        ) : null}
        <span className="mt-1 block truncate text-[11px] text-muted-foreground">
          {campus.tagline}
        </span>
      </span>
    </>
  );

  const className = cn(
    "flex h-full items-start gap-2.5 rounded-2xl border bg-surface p-3 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary-soft/30",
    campus.status === "live" ? "border-primary/40" : "border-border",
    wide && "items-center",
  );

  return campus.path ? (
    <Link to={campus.path} className={className}>
      {content}
    </Link>
  ) : (
    <Link to="/campus/$campusSlug" params={{ campusSlug: campus.slug }} className={className}>
      {content}
    </Link>
  );
}
