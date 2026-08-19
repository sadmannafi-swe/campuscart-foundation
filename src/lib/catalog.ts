import type { Product } from "@/lib/types";
import { getStoreById, categories } from "@/data/marketplace";

export type SortKey = "relevance" | "price-asc" | "price-desc" | "rating" | "newest";

export const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest" },
];

export const PRICE_MIN = 0;
export const PRICE_MAX = 40000;

export const ratingOptions: Array<{ value: number; label: string }> = [
  { value: 0, label: "All ratings" },
  { value: 2, label: "2★ & above" },
  { value: 3, label: "3★ & above" },
  { value: 4, label: "4★ & above" },
];

export interface CatalogQuery {
  q?: string | undefined;
  /** single category slug (legacy deep links) */
  category?: string | undefined;
  /** multi-select category slugs */
  cats?: string[] | undefined;
  stores?: string[] | undefined;
  min?: number | undefined;
  max?: number | undefined;
  rating?: number | undefined;
  instock?: boolean | undefined;
  sort?: SortKey | undefined;
}

/** Pure catalogue logic, kept out of UI components so it can move server-side later. */
export function filterProducts(source: Product[], query: CatalogQuery): Product[] {
  const term = query.q?.trim().toLowerCase();
  const selectedCats = [
    ...(query.cats ?? []),
    ...(query.category ? [query.category] : []),
  ];

  let list = source.filter((product) => {
    if (selectedCats.length > 0 && !selectedCats.includes(product.categorySlug)) return false;
    if (query.stores && query.stores.length > 0 && !query.stores.includes(product.storeId))
      return false;
    if (query.min !== undefined && product.price < query.min) return false;
    if (query.max !== undefined && product.price > query.max) return false;
    if (query.rating !== undefined && query.rating > 0 && product.rating < query.rating) return false;
    if (query.instock && !product.inStock) return false;
    if (!term) return true;
    const store = getStoreById(product.storeId);
    const category = categories.find((c) => c.slug === product.categorySlug);
    return (
      product.name.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term) ||
      product.categorySlug.includes(term) ||
      (category?.name.toLowerCase().includes(term) ?? false) ||
      (store?.name.toLowerCase().includes(term) ?? false)
    );
  });

  switch (query.sort) {
    case "price-asc":
      list = [...list].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list = [...list].sort((a, b) => b.price - a.price);
      break;
    case "rating":
      list = [...list].sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
      list = [...list].sort(
        (a, b) => Number(b.tags.includes("new")) - Number(a.tags.includes("new")),
      );
      break;
    default:
      break;
  }

  return list;
}

export function countActiveFilters(query: CatalogQuery): number {
  let n = 0;
  n += (query.cats?.length ?? 0) + (query.category ? 1 : 0);
  n += query.stores?.length ?? 0;
  if (query.min !== undefined && query.min > PRICE_MIN) n += 1;
  if (query.max !== undefined && query.max < PRICE_MAX) n += 1;
  if (query.rating) n += 1;
  if (query.instock) n += 1;
  return n;
}
