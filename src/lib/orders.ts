import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Order = Tables<"orders"> & { order_items: Tables<"order_items">[] };
export type OrderStatus = Tables<"orders">["status"];

export const orderStatuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const orderStatusMeta: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning-foreground" },
  confirmed: { label: "Confirmed", className: "bg-primary-soft text-primary" },
  processing: { label: "Processing", className: "bg-primary-soft text-primary" },
  shipped: { label: "Shipped", className: "bg-primary-soft text-primary" },
  delivered: { label: "Delivered", className: "bg-accent-soft text-accent" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
};

export const shortOrderId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

export function useBuyerOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ["buyer-orders", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("buyer_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });
}

export function useSellerOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ["seller-orders", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("seller_user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });
}
