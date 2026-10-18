import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProductReview = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  created_at: string;
};

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-reviews", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductReview[]> => {
      if (!productId) return [];
      const { data, error } = await supabase.rpc("get_product_reviews", { _product_id: productId });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBuyerReviews(userId: string | undefined) {
  return useQuery({
    queryKey: ["buyer-reviews", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Tables<"product_reviews">[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.from("product_reviews").select("*").eq("buyer_id", userId);
      if (error) throw error;
      return data ?? [];
    },
  });
}