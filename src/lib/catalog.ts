import type { Product } from "@/lib/types";
import { getStoreById } from "@/data/marketplace";

export type SortKey = "relevance" | "price-asc" | "price-desc" | "rating" | "newest";

export const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "relevance", label: "Most relevant" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest first" },
];

export interface CatalogQuery {
  q?: string | undefined;
  category?: string | undefined;
  sort?: SortKey | undefined;
}

/** Pure catalogue logic, kept out of UI components so it can move server-side later. */
export function filterProducts(source: Product[], query: CatalogQuery): Product[] {
  const term = query.q?.trim().toLowerCase();

  let list = source.filter((product) => {
    if (query.category && product.categorySlug !== query.category) return false;
    if (!term) return true;
    const store = getStoreById(product.storeId);
    return (
      product.name.toLowerCase().includes(term) ||
      product.categorySlug.includes(term) ||
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
