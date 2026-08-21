import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { StoreCard } from "@/components/commerce/StoreCard";
import { EmptyState } from "@/components/common/StateBlocks";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categories, stores } from "@/data/marketplace";

export const Route = createFileRoute("/stores/")({
  head: () => ({
    meta: [
      { title: "Campus Stores — DIU CampusCart" },
      {
        name: "description",
        content: "Browse verified student-run stores at DIU: books, electronics, food, fashion and services.",
      },
      { property: "og:title", content: "Campus Stores — DIU CampusCart" },
      { property: "og:description", content: "Discover verified student-run stores on the DIU campus." },
    ],
  }),
  component: StoresPage,
});

function StoresPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(
    () =>
      stores.filter(
        (store) =>
          (category === "all" || store.categorySlug === category) &&
          store.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query, category],
  );

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <BackButton className="mb-3" />
        <PageBreadcrumb items={[{ label: "Home", to: "/" }, { label: "Stores" }]} />

        <h1 className="text-2xl font-extrabold sm:text-3xl">Campus stores</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {stores.length} student-run stores serving the DIU community. Follow your favourites and
          order directly from campus.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-center">
          <div className="relative">
            <label htmlFor="store-search" className="sr-only">
              Search stores
            </label>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="store-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stores"
              className="h-11 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <Tabs value={category} onValueChange={setCategory} className="min-w-0">
            <TabsList className="flex w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.map((c) => (
                <TabsTrigger key={c.id} value={c.slug} className="whitespace-nowrap">
                  {c.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-8">
          {filtered.length === 0 ? (
            <EmptyState
              title="No stores found"
              description="Try a different name or category filter."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
