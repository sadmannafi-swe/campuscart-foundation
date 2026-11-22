import { useQuery } from "@tanstack/react-query";
import type { PublicReview, Review, SellerReview } from "@shared/types";
import { api } from "@/lib/api";

export type ProductReview = PublicReview;

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-reviews", productId],
    enabled: Boolean(productId),
    queryFn: () => api<ProductReview[]>(`/products/${productId}/reviews`),
  });
}

export function useBuyerReviews(userId: string | undefined) {
  return useQuery({
    queryKey: ["buyer-reviews", userId],
    enabled: Boolean(userId),
    queryFn: () => api<Review[]>("/me/reviews"),
  });
}

export function useSellerReviews(userId: string | undefined) {
  return useQuery({
    queryKey: ["seller-reviews", userId],
    enabled: Boolean(userId),
    queryFn: () => api<SellerReview[]>("/seller/reviews"),
  });
}
