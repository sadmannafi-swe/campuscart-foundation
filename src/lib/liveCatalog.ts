import { useQuery } from "@tanstack/react-query";
import type { PublicProduct, PublicStore } from "@shared/types";
import { api } from "@/lib/api";
import { thumbUrl } from "@/lib/uploads";
import type { Product } from "@/lib/types";
import { products as staticProducts } from "@/data/marketplace";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const liveProductSlug = (name: string, id: string) =>
  `${slugify(name) || "listing"}-${id.slice(0, 8)}`;

const NEW_WINDOW_DAYS = 30;

/** Live listings published by approved campus stores, mapped to the buyer Product shape. */
async function fetchLiveProducts(): Promise<Product[]> {
  const rows = await api<PublicProduct[]>("/products");
  const now = Date.now();
  return rows.map((row) => {
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
      originalPrice: undefined,
      rating: row.rating,
      reviewCount: row.review_count,
      inStock: row.in_stock,
      condition: (row.condition as Product["condition"]) ?? "new",
      description: row.description,
      highlights: ["Listed by a verified campus seller", "Meet-up on campus"],
      variants: undefined,
      tags: isNew ? (["new"] as Product["tags"]) : ([] as Product["tags"]),
      accentFrom: "from-primary-soft",
      accentTo: "to-accent-soft",
    } satisfies Product;
  });
}

export function useLiveProducts() {
  return useQuery({
    queryKey: ["live-products"],
    queryFn: fetchLiveProducts,
    staleTime: 30 * 1000,
  });
}

/** Live seller listings first, then the seeded catalogue. */
export function useCatalogProducts() {
  const { data, isLoading } = useLiveProducts();
  return { products: [...(data ?? []), ...staticProducts], isLoading };
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
  return useQuery({
    queryKey: ["live-store", id],
    queryFn: () => api<PublicStore>(`/stores/${id}`).catch(() => null),
  });
}
