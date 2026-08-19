import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { SearchBar } from "@/components/layout/SearchBar";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { EmptyState } from "@/components/common/StateBlocks";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories, products } from "@/data/marketplace";
import { filterProducts, sortOptions, type SortKey } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface ProductSearch {
  q?: string | undefined;
  category?: string | undefined;
  sort?: SortKey | undefined;
}

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    q: typeof search['q'] === "string" && search['q'] ? search['q'] : undefined,
    category: typeof search['category'] === "string" ? search['category'] : undefined,
    sort: sortOptions.some((o) => o.value === search['sort'])
      ? (search['sort'] as SortKey)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse Products — DIU CampusCart" },
      {
        name: "description",
        content: "Search and filter thousands of student listings: books, gadgets, fashion, food and services.",
      },
      { property: "og:title", content: "Browse Products — DIU CampusCart" },
      { property: "og:description", content: "Search, filter and sort student listings on DIU CampusCart." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/products/" });

  const results = useMemo(() => filterProducts(products, search), [search]);
  const activeCategory = categories.find((c) => c.slug === search.category);

  const setCategory = (slug?: string) =>
    navigate({ search: (prev) => ({ ...prev, category: slug }) });
  const setSort = (sort: SortKey) => navigate({ search: (prev) => ({ ...prev, sort }) });

  const filters = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold">Categories</h3>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => setCategory(undefined)}
              className={cn(
                "w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                !search.category && "bg-primary-soft font-semibold text-primary",
              )}
            >
              All categories
            </button>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => setCategory(category.slug)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  search.category === category.slug && "bg-primary-soft font-semibold text-primary",
                )}
              >
                <CategoryIcon name={category.icon} className="size-4" />
                <span className="flex-1 truncate">{category.name}</span>
                <span className="text-xs text-muted-foreground">{category.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold">Quick filters</h3>
        <div className="flex flex-wrap gap-2">
          {["Under ৳500", "Free delivery", "Verified sellers", "In stock", "Discounted"].map(
            (label) => (
              <Badge key={label} variant="secondary" className="cursor-default py-1">
                {label}
              </Badge>
            ),
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Advanced filters activate with live inventory in a later phase.
        </p>
      </div>
    </div>
  );

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <PageBreadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Products", to: "/products" },
            ...(activeCategory ? [{ label: activeCategory.name }] : []),
          ]}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              {activeCategory ? activeCategory.name : search.q ? `Results for “${search.q}”` : "All products"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? "listing" : "listings"} available
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[86vw] max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left">Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">{filters}</div>
              </SheetContent>
            </Sheet>

            <Select value={search.sort ?? "relevance"} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-44" aria-label="Sort products">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <SearchBar defaultValue={search.q ?? ""} placeholder="Search products" />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="card-surface sticky top-28 p-5">{filters}</div>
          </aside>

          <div className="min-w-0">
            {results.length === 0 ? (
              <EmptyState
                title="No products matched"
                description="Try clearing filters or searching for something else."
                action={
                  <Button variant="outline" onClick={() => navigate({ search: {} })}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <ProductGrid products={results} />
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
