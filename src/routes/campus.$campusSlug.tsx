import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getCampus } from "@/data/campuses";

export const Route = createFileRoute("/campus/$campusSlug")({
  loader: ({ params }) => {
    const campus = getCampus(params.campusSlug);
    if (!campus) throw notFound();
    return { campus };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.campus.name ?? "CampusCart";
    return {
      meta: [
        { title: `${name} — Coming soon on CampusCart` },
        {
          name: "description",
          content: `${name} is being prepared. Explore the live DIU CampusCart marketplace in the meantime.`,
        },
        { property: "og:title", content: `${name} — Coming soon on CampusCart` },
        {
          property: "og:description",
          content: "A new university marketplace is on the way.",
        },
      ],
    };
  },
  component: CampusComingSoon,
});

function CampusComingSoon() {
  const { campus } = Route.useLoaderData();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="container-page flex h-14 items-center justify-between">
          <Logo size="sm" asLink={false} />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">All campuses</Link>
          </Button>
        </div>
      </header>

      <main className="container-page flex flex-1 items-center justify-center py-12">
        <div className="max-w-md text-center">
          <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary">
            Coming soon
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{campus.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This campus marketplace is being set up. In the meantime you can explore the live DIU
            CampusCart marketplace.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/diu">Visit DIU CampusCart</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Choose another campus</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
