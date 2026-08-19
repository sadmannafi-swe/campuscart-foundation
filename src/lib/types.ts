/**
 * Domain types for DIU CampusCart.
 * These mirror the shape the future backend (Supabase) will return,
 * so UI components never need to change when real data arrives.
 */

export type StoreStatus = "open" | "closed" | "busy";

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  productCount: number;
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  description: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  status: StoreStatus;
  location: string;
  responseTime: string;
  joinedAt: string;
  verified: boolean;
  featured: boolean;
  accentFrom: string;
  accentTo: string;
  initials: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  options: string[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  storeId: string;
  price: number;
  originalPrice?: number | undefined;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  condition: "new" | "like-new" | "used";
  description: string;
  highlights: string[];
  variants?: ProductVariant[] | undefined;
  tags: Array<"featured" | "trending" | "new" | "offer">;
  accentFrom: string;
  accentTo: string;
}
