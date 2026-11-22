import { useQuery } from "@tanstack/react-query";
import type {
  Seller as SellerT,
  SellerProduct as SellerProductT,
  Store as StoreT,
  StoreStatus as StoreStatusT,
} from "@shared/types";
import {
  STORE_CATEGORIES,
  PRODUCT_CONDITIONS,
  UNIVERSITIES,
  type University as UniversityT,
} from "@shared/universities";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type University = UniversityT;
export type Seller = SellerT;
export type Store = StoreT;
export type SellerProduct = SellerProductT;
export type StoreStatus = StoreStatusT;

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

export const storeCategories = STORE_CATEGORIES;
export const productConditions = PRODUCT_CONDITIONS;

/** All university marketplaces — data driven, new campuses need no code change. */
export function useUniversities() {
  return useQuery({
    queryKey: ["universities"],
    queryFn: async () =>
      UNIVERSITIES.filter((u) => u.is_active).sort((a, b) => a.sort_order - b.sort_order),
    staleTime: Infinity,
    initialData: UNIVERSITIES,
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
    queryFn: () => api<SellerContext>("/seller/account"),
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
    queryFn: () => api<SellerProduct[]>("/seller/products"),
  });
}

/** Images are stored as public Cloudinary URLs; kept as a hook so call sites stay unchanged. */
export function useSignedUrl(path: string | null | undefined) {
  return { data: path ?? null };
}
