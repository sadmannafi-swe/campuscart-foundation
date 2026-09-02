import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

export type University = Tables<"universities">;
export type Seller = Tables<"sellers">;
export type Store = Tables<"stores">;
export type SellerProduct = Tables<"seller_products">;
export type StoreStatus = Store["status"];

export const SELLER_MEDIA_BUCKET = "seller-media";

export const storeStatusMeta: Record<
  StoreStatus,
  { label: string; className: string; public: boolean }
> = {
  pending: {
    label: "Pending Approval",
    className: "bg-warning/15 text-warning-foreground",
    public: false,
  },
  approved: { label: "Approved", className: "bg-accent-soft text-accent", public: true },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive", public: false },
  suspended: { label: "Unpublished", className: "bg-muted text-muted-foreground", public: false },
};

export const storeCategories = [
  "Textbooks & Notes",
  "Electronics",
  "Stationery",
  "Campus Fashion",
  "Food & Snacks",
  "Hostel Essentials",
  "Sports & Fitness",
  "Student Services",
] as const;

export const productConditions = ["new", "like-new", "used"] as const;

/** All university marketplaces — data driven, new campuses need no code change. */
export function useUniversities() {
  return useQuery({
    queryKey: ["universities"],
    queryFn: async (): Promise<University[]> => {
      const { data, error } = await supabase
        .from("universities")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface SellerContext {
  seller: Seller | null;
  store: Store | null;
}

export function useSellerAccount() {
  const { user, loading } = useAuth();
  const query = useQuery({
    queryKey: ["seller-account", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SellerContext> => {
      const { data: seller, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!seller) return { seller: null, store: null };
      const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("seller_id", seller.id)
        .maybeSingle();
      return { seller, store: store ?? null };
    },
  });

  return {
    ...query,
    authLoading: loading,
    user,
    seller: query.data?.seller ?? null,
    store: query.data?.store ?? null,
  };
}

export function useSellerProducts(storeId: string | undefined) {
  return useQuery({
    queryKey: ["seller-products", storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<SellerProduct[]> => {
      const { data, error } = await supabase
        .from("seller_products")
        .select("*")
        .eq("store_id", storeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function uploadSellerFile(userId: string, file: File, prefix: string) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(SELLER_MEDIA_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["seller-media", path],
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase.storage
        .from(SELLER_MEDIA_BUCKET)
        .createSignedUrl(path!, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });
}
