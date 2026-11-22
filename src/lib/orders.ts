import { useQuery } from "@tanstack/react-query";
import {
  canMoveOrder,
  ORDER_STATUSES,
  type Order as OrderT,
  type OrderStatus as OrderStatusT,
} from "@shared/types";
import { api } from "@/lib/api";

export type Order = OrderT;
export type OrderStatus = OrderStatusT;

export const orderStatuses: OrderStatus[] = ORDER_STATUSES;

export const orderStatusMeta: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning-foreground" },
  confirmed: { label: "Confirmed", className: "bg-primary-soft text-primary" },
  processing: { label: "Processing", className: "bg-primary-soft text-primary" },
  shipped: { label: "Shipped", className: "bg-primary-soft text-primary" },
  delivered: { label: "Delivered", className: "bg-accent-soft text-accent" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
};

/** Forward-only: delivered/cancelled are final (mirrors the server rule). */
export function allowedOrderStatuses(current: OrderStatus): OrderStatus[] {
  return orderStatuses.filter((s) => canMoveOrder(current, s));
}

export const isFinalOrderStatus = (s: OrderStatus) => s === "delivered" || s === "cancelled";

export const shortOrderId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

export function useBuyerOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ["buyer-orders", userId],
    enabled: !!userId,
    refetchInterval: 15000,
    queryFn: () => api<Order[]>("/orders"),
  });
}

export function useSellerOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ["seller-orders", userId],
    enabled: !!userId,
    refetchInterval: 15000,
    queryFn: () => api<Order[]>("/seller/orders"),
  });
}
