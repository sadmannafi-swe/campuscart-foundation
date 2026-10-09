import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/types";
import { products as staticProducts } from "@/data/marketplace";
import { SELLER_MEDIA_BUCKET } from "@/lib/seller";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const liveProductSlug = (name: string, id: string) =>
  `${slugify(name) || "listing"}-${id.slice(0, 8)}`;

const NEW_WINDOW_DAYS = 30;

interface Row {
  id: string;
  name: string;
  category: string;
  price: number;
  condition: string;
  description: string;
  images: unknown;
  in_stock: boolean;
  store_id: string;
  created_at: string;
  university_slug: string;
  featured_university_slug: string | null;
  stores: { id: string; name: string; status: string; seller_id: string } | null;
}

/** Live listings published by approved campus stores, mapped to the buyer Product shape. */
async function fetchLiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("seller_products")
    .select("id,name,category,price,condition,description,images,in_stock,store_id,created_at,university_slug,featured_university_slug,stores!inner(id,name,status,seller_id)")
    .eq("is_active", true)
    .eq("stores.status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as Row[];
  const firstPaths = rows
    .map((r) => ((r.images as string[] | null) ?? [])[0])
    .filter((p): p is string => typeof p === "string" && p.length > 0);

  const urlByPath = new Map<string, string>();
  if (firstPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(SELLER_MEDIA_BUCKET)
      .createSignedUrls(firstPaths, 60 * 60);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
    }
  }

  const now = Date.now();
  return rows.map((row) => {
    const path = ((row.images as string[] | null) ?? [])[0];
    const isNew = now - new Date(row.created_at).getTime() < NEW_WINDOW_DAYS * 86_400_000;
    return {
      id: row.id,
      slug: liveProductSlug(row.name, row.id),
      name: row.name,
      categorySlug: row.category,
      storeId: row.store_id,
      storeName: row.stores?.name ?? "Campus seller",
      image: path ? urlByPath.get(path) : undefined,
      imagePath: path,
      sellerId: row.stores?.seller_id,
      universitySlug: row.university_slug,
      featuredIn: row.featured_university_slug ?? undefined,
      live: true,
      price: Number(row.price),
      originalPrice: undefined,
      rating: 0,
      reviewCount: 0,
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
    queryFn: async (): Promise<FeaturedLiveStore[]> => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,category,description")
        .eq("status", "approved")
        .eq("featured_university_slug", universitySlug)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
