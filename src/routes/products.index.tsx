import { useMemo, useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { SlidersHorizontal, X } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { SearchBar } from "@/components/layout/SearchBar";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { EmptyState } from "@/components/common/StateBlocks";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories, products, stores } from "@/data/marketplace";
import {
  filterProducts,
  sortOptions,
  ratingOptions,
  countActiveFilters,
  PRICE_MIN,
  PRICE_MAX,
  type SortKey,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProductSearch {
  q?: string | undefined;
  category?: string | undefined;
  cats?: string[] | undefined;
  stores?: string[] | undefined;
  min?: number | undefined;
  max?: number | undefined;
  rating?: number | undefined;
  instock?: boolean | undefined;
  sort?: SortKey | undefined;
}

const toStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const list = value.filter((v): v is string => typeof v === "string");
    return list.length ? list : undefined;
  }
  if (typeof value === "string" && value) return [value];
  return undefined;
};

const toNumber = (value: unknown): number | undefined => {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    q: typeof search['q'] === "string" && search['q'] ? search['q'] : undefined,
    category: typeof search['category'] === "string" ? search['category'] : undefined,
    cats: toStringArray(search['cats']),
    stores: toStringArray(search['stores']),
    min: toNumber(search['min']),
    max: toNumber(search['max']),
    rating: toNumber(search['rating']),
    instock: search['instock'] === true || search['instock'] === "true" ? true : undefined,
    sort: sortOptions.some((o) => o.value === search['sort'])
      ? (search['sort'] as SortKey)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Search Products — DIU CampusCart" },
      {
        name: "description",
        content:
          "Search student listings and filter by category, price, rating, store and availability on DIU CampusCart.",
      },
      { property: "og:title", content: "Search Products — DIU CampusCart" },
      {
        property: "og:description",
        content: "Search, filter and sort student listings on DIU CampusCart.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/products/" });

  const results = useMemo(() => filterProducts(products, search), [search]);
  const activeCategory = categories.find((c) => c.slug === search.category);
  const activeCount = countActiveFilters(search);

  const selectedCats = useMemo(
    () => [...(search.cats ?? []), ...(search.category ? [search.category] : [])],
    [search.cats, search.category],
  );
  const selectedStores = search.stores ?? [];

  const matchingStores = useMemo(() => {
    const term = search.q?.trim().toLowerCase();
    if (!term) return [];
    return stores
      .filter(
        (s) =>
          s.name.toLowerCase().includes(term) || s.categoryName.toLowerCase().includes(term),
      )
      .slice(0, 4);
  }, [search.q]);

  const matchingCategories = useMemo(() => {
    const term = search.q?.trim().toLowerCase();
    if (!term) return [];
    return categories.filter((c) => c.name.toLowerCase().includes(term)).slice(0, 4);
  }, [search.q]);

  const setSort = (sort: SortKey) => navigate({ search: (prev) => ({ ...prev, sort }) });

  const toggleCategory = (slug: string) => {
    const next = selectedCats.includes(slug)
      ? selectedCats.filter((s) => s !== slug)
      : [...selectedCats, slug];
    navigate({
      search: (prev) => ({ ...prev, category: undefined, cats: next.length ? next : undefined }),
    });
  };

  const toggleStore = (id: string) => {
    const next = selectedStores.includes(id)
      ? selectedStores.filter((s) => s !== id)
      : [...selectedStores, id];
    navigate({ search: (prev) => ({ ...prev, stores: next.length ? next : undefined }) });
  };

  const setRating = (value: number) =>
    navigate({ search: (prev) => ({ ...prev, rating: value > 0 ? value : undefined }) });

  const setInStock = (value: boolean) =>
    navigate({ search: (prev) => ({ ...prev, instock: value ? true : undefined }) });

  const setPrice = (min: number, max: number) =>
    navigate({
      search: (prev) => ({
        ...prev,
        min: min > PRICE_MIN ? min : undefined,
        max: max < PRICE_MAX ? max : undefined,
      }),
    });

  const resetFilters = () =>
    navigate({ search: (prev) => ({ q: prev.q, sort: prev.sort }) });

  const filters = (
    <FilterPanel
      selectedCats={selectedCats}
      selectedStores={selectedStores}
      min={search.min ?? PRICE_MIN}
      max={search.max ?? PRICE_MAX}
      rating={search.rating ?? 0}
      instock={search.instock ?? false}
      onToggleCategory={toggleCategory}
      onToggleStore={toggleStore}
      onPrice={setPrice}
      onRating={setRating}
      onInStock={setInStock}
    />
  );

  return (
    <SiteLayout>
      <div className="container-page py-5">
        <PageBreadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Search", to: "/products" },
            ...(activeCategory ? [{ label: activeCategory.name }] : []),
          ]}
        />

        <SearchBar defaultValue={search.q ?? ""} placeholder="Search products, stores or categories" />

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold sm:text-2xl">
              {search.q
                ? `Results for “${search.q}”`
                : activeCategory
                  ? activeCategory.name
                  : "All products"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? "listing" : "listings"} found
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal /> Filter
                  {activeCount > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                      {activeCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[88vh] rounded-t-2xl p-0">
                <SheetHeader className="border-b border-border px-4 py-3">
                  <SheetTitle className="text-left text-sm font-bold uppercase tracking-wide">
                    Filter
                  </SheetTitle>
                </SheetHeader>
                <div className="max-h-[60vh] overflow-y-auto px-4 py-4">{filters}</div>
                <div className="sticky bottom-0 flex gap-2 border-t border-border bg-surface px-4 py-3">
                  <Button variant="outline" className="flex-1" onClick={resetFilters}>
                    Reset
                  </Button>
                  <SheetTrigger asChild>
                    <Button className="flex-1">Apply Filters</Button>
                  </SheetTrigger>
                </div>
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

        {(matchingStores.length > 0 || matchingCategories.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Also matching:</span>
            {matchingCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.slug)}
                className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-primary-soft hover:text-primary"
              >
                {category.name}
              </button>
            ))}
            {matchingStores.map((store) => (
              <Link
                key={store.id}
                to="/stores/$storeSlug"
                params={{ storeSlug: store.slug }}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-primary-soft hover:text-primary"
              >
                {store.name}
              </Link>
            ))}
          </div>
        )}

        {activeCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {selectedCats.map((slug) => (
              <Badge key={slug} variant="secondary" className="gap-1 py-1">
                {categories.find((c) => c.slug === slug)?.name ?? slug}
                <button
                  type="button"
                  aria-label="Remove category filter"
                  onClick={() => toggleCategory(slug)}
                  className="cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {selectedStores.map((id) => (
              <Badge key={id} variant="secondary" className="gap-1 py-1">
                {stores.find((s) => s.id === id)?.name ?? id}
                <button
                  type="button"
                  aria-label="Remove store filter"
                  onClick={() => toggleStore(id)}
                  className="cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {search.rating ? (
              <Badge variant="secondary" className="py-1">{search.rating}★ & above</Badge>
            ) : null}
            {search.instock ? (
              <Badge variant="secondary" className="py-1">In stock only</Badge>
            ) : null}
            {(search.min !== undefined || search.max !== undefined) && (
              <Badge variant="secondary" className="py-1">
                {formatPrice(search.min ?? PRICE_MIN)} — {formatPrice(search.max ?? PRICE_MAX)}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear all
            </Button>
          </div>
        )}

        <div className="mt-5 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="card-surface sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide">Filter</h2>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              {filters}
            </div>
          </aside>

          <div className="min-w-0">
            {results.length === 0 ? (
              <EmptyState
                title="No products found"
                description="Nothing matched this search and filter combination."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={resetFilters}>
                      Clear filters
                    </Button>
                    <Button asChild>
                      <Link to="/products" search={{}}>
                        Try another search
                      </Link>
                    </Button>
                  </div>
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

function FilterPanel({
  selectedCats,
  selectedStores,
  min,
  max,
  rating,
  instock,
  onToggleCategory,
  onToggleStore,
  onPrice,
  onRating,
  onInStock,
}: {
  selectedCats: string[];
  selectedStores: string[];
  min: number;
  max: number;
  rating: number;
  instock: boolean;
  onToggleCategory: (slug: string) => void;
  onToggleStore: (id: string) => void;
  onPrice: (min: number, max: number) => void;
  onRating: (value: number) => void;
  onInStock: (value: boolean) => void;
}) {
  const [range, setRange] = useState<[number, number]>([min, max]);
  useEffect(() => setRange([min, max]), [min, max]);

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Category
        </h3>
        <ul className="space-y-1">
          {categories.map((category) => (
            <li key={category.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                  selectedCats.includes(category.slug) && "bg-primary-soft text-primary",
                )}
              >
                <Checkbox
                  checked={selectedCats.includes(category.slug)}
                  onCheckedChange={() => onToggleCategory(category.slug)}
                />
                <CategoryIcon name={category.icon} className="size-4" />
                <span className="flex-1 truncate">{category.name}</span>
                <span className="text-xs text-muted-foreground">{category.productCount}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Price Range
        </h3>
        <Slider
          value={range}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={100}
          minStepsBetweenThumbs={1}
          onValueChange={(v) => setRange([v[0] ?? PRICE_MIN, v[1] ?? PRICE_MAX])}
          onValueCommit={(v) => onPrice(v[0] ?? PRICE_MIN, v[1] ?? PRICE_MAX)}
          aria-label="Price range"
        />
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            value={range[0]}
            aria-label="Minimum price"
            onChange={(e) => setRange([Number(e.target.value), range[1]])}
            onBlur={() => onPrice(range[0], range[1])}
            className="h-9"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            inputMode="numeric"
            value={range[1]}
            aria-label="Maximum price"
            onChange={(e) => setRange([range[0], Number(e.target.value)])}
            onBlur={() => onPrice(range[0], range[1])}
            className="h-9"
          />
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Rating
        </h3>
        <div className="space-y-1">
          {ratingOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                rating === option.value && "bg-primary-soft font-semibold text-primary",
              )}
            >
              <input
                type="radio"
                name="rating-filter"
                className="accent-primary"
                checked={rating === option.value}
                onChange={() => onRating(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Store
        </h3>
        <ul className="max-h-52 space-y-1 overflow-y-auto pr-1">
          {stores.map((store) => (
            <li key={store.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted">
                <Checkbox
                  checked={selectedStores.includes(store.id)}
                  onCheckedChange={() => onToggleStore(store.id)}
                />
                <span className="flex-1 truncate">{store.name}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Availability
        </h3>
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
          <Label htmlFor="instock-filter" className="cursor-pointer text-sm">
            In stock only
          </Label>
          <Switch id="instock-filter" checked={instock} onCheckedChange={onInStock} />
        </div>
      </section>
    </div>
  );
}
