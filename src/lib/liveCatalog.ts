import { useQuery } from "@tanstack/react-query";
import type { PublicProduct, PublicStore, PublicStoreSummary } from "@shared/types";
import { api } from "@/lib/api";
import { thumbUrl } from "@/lib/uploads";
import { useMarketplace } from "@/lib/marketplace";
import type { Product, Store } from "@/lib/types";
import { categories, products as sampleProducts, stores as sampleStores } from "@/data/marketplace";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const liveProductSlug = (name: string, id: string) =>
  `${slugify(name) || "listing"}-${id.slice(0, 8)}`;

const NEW_WINDOW_DAYS = 30;

/** Live listings published by approved campus stores, mapped to the buyer Product shape. */
/** Map an API listing to the buyer Product shape (pure; unit-tested). */
export function liveProductFromApi(row: PublicProduct, now = Date.now()): Product {
  const image = row.images[0];
  const isNew = now - new Date(row.created_at).getTime() < NEW_WINDOW_DAYS * 86_400_000;
  return {
    id: row.id,
    slug: liveProductSlug(row.name, row.id),
    name: row.name,
    categorySlug: row.category,
    storeId: row.store_id,
    storeName: row.store_name,
    image: thumbUrl(image, 800) ?? undefined,
    imagePath: image,
    sellerId: row.seller_id,
    universitySlug: row.university_slug,
    featuredIn: row.featured_university_slug ?? undefined,
    live: true,
    price: Number(row.price),
    // Only a valid "was" price (greater than the selling price) marks an offer.
    originalPrice:
      row.original_price != null && row.original_price > Number(row.price)
        ? Number(row.original_price)
        : undefined,
    rating: row.rating,
    reviewCount: row.review_count,
    inStock: row.in_stock,
    condition: (row.condition as Product["condition"]) ?? "new",
    description: row.description,
    highlights: ["Listed by a verified campus seller", "Meet-up on campus"],
    variants: undefined,
    tags: [
      ...(isNew ? (["new"] as const) : []),
      ...(row.original_price != null && row.original_price > Number(row.price)
        ? (["offer"] as const)
        : []),
    ],
    accentFrom: "from-primary-soft",
    accentTo: "to-accent-soft",
  } satisfies Product;
}

async function fetchLiveProducts(university: string): Promise<Product[]> {
  const rows = await api<PublicProduct[]>(`/products?university=${encodeURIComponent(university)}`);
  const now = Date.now();
  return rows.map((row) => liveProductFromApi(row, now));
}

/** Live listings of the current university marketplace (server-filtered). */
export function useLiveProducts() {
  const university = useMarketplace();
  return useQuery({
    queryKey: ["live-products", university],
    queryFn: () => fetchLiveProducts(university),
    staleTime: 30 * 1000,
  });
}

/** Live seller listings (plus the dev-only sample catalogue when enabled). */
export function useCatalogProducts() {
  const { data, isLoading } = useLiveProducts();
  return { products: [...(data ?? []), ...sampleProducts], isLoading };
}

const categoryByName = (name: string) =>
  categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());

/** Map an approved store from the API to the card shape the UI already uses. */
export function liveStoreToStore(s: PublicStoreSummary): Store {
  const category = categoryByName(s.category);
  return {
    id: s.id,
    slug: s.id,
    name: s.name,
    categorySlug: category?.slug ?? s.category,
    categoryName: category?.name ?? s.category,
    description: s.description,
    rating: s.rating,
    reviewCount: s.review_count,
    productCount: s.product_count,
    status: "open",
    location: "On campus",
    responseTime: "Usually within a day",
    joinedAt: new Date(s.approved_at ?? s.created_at).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    }),
    verified: true,
    featured: Boolean(s.featured_university_slug),
    accentFrom: "from-primary-soft",
    accentTo: "to-accent-soft",
    initials: s.name.slice(0, 2).toUpperCase(),
  };
}

/** Approved stores of the current marketplace, plus dev-only samples when enabled. */
export function useLiveStores() {
  const universitySlug = useMarketplace();
  const query = useQuery({
    queryKey: ["live-stores", universitySlug],
    staleTime: 30 * 1000,
    queryFn: async () =>
      (
        await api<PublicStoreSummary[]>(`/stores?university=${encodeURIComponent(universitySlug)}`)
      ).map(liveStoreToStore),
  });
  return { ...query, stores: [...(query.data ?? []), ...sampleStores] };
}

/** Number of live listings per category slug. */
export function useCategoryCounts(): Record<string, number> {
  const { products } = useCatalogProducts();
  const counts: Record<string, number> = {};
  for (const p of products) counts[p.categorySlug] = (counts[p.categorySlug] ?? 0) + 1;
  return counts;
}

export interface FeaturedLiveStore {
  id: string;
  name: string;
  category: string;
  description: string;
}

/** Approved stores the admin featured for one university marketplace. */
export function useFeaturedLiveStores(universitySlug: string) {
  return useQuery({
    queryKey: ["featured-live-stores", universitySlug],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<FeaturedLiveStore[]> =>
      api<PublicStore[]>(`/stores/featured?university=${encodeURIComponent(universitySlug)}`),
  });
}

export function useLiveStore(id: string) {
  const university = useMarketplace();
  return useQuery({
    queryKey: ["live-store", id, university],
    queryFn: () =>
      api<PublicStore>(`/stores/${id}?university=${encodeURIComponent(university)}`).catch(
        () => null,
      ),
  });
}
