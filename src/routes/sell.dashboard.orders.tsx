import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SellerShell, SellerPlaceholder } from "@/components/seller/SellerShell";
import { ItemThumb } from "@/components/commerce/ItemThumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  orderStatuses,
  orderStatusMeta,
  shortOrderId,
  useSellerOrders,
  type OrderStatus,
} from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUniversities } from "@/lib/seller";

export const Route = createFileRoute("/sell/dashboard/orders")({
  validateSearch: (s: Record<string, unknown>): { order?: string } =>
    typeof s["order"] === "string" ? { order: s["order"] } : {},
  component: SellerOrders,
});

function SellerOrders() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useSellerOrders(user?.id);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const queryClient = useQueryClient();
  const { order: focusId } = Route.useSearch();
  const { data: universities = [] } = useUniversities();

  useEffect(() => {
    if (!focusId || orders.length === 0) return;
    document.getElementById(`order-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, orders.length]);

  const update = useMutation({
    mutationFn: async (v: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.rpc("update_order_status", { _order_id: v.id, _status: v.status });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order status updated");
      void queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update order."),
  });

  const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <SellerShell title="Orders">
      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <SellerPlaceholder
          title="No orders yet"
          description="Orders placed for your store's products will appear here with their status and buyer details."
        />
      ) : (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {(["all", ...orderStatuses] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                  filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {s === "all" ? "All" : orderStatusMeta[s].label} (
                {s === "all" ? orders.length : orders.filter((o) => o.status === s).length})
              </button>
            ))}
          </div>
          <ul className="space-y-3">
            {visible.map((order) => (
              <li key={order.id} id={`order-${order.id}`} className={cn("card-surface p-4", focusId === order.id && "ring-2 ring-primary")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{shortOrderId(order.id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Select
                    value={order.status}
                    onValueChange={(v) => update.mutate({ id: order.id, status: v as OrderStatus })}
                    disabled={update.isPending}
                  >
                    <SelectTrigger className={cn("h-8 w-36 text-xs font-semibold", orderStatusMeta[order.status].className)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orderStatuses.map((s) => (
                        <SelectItem key={s} value={s}>{orderStatusMeta[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ul className="mt-3 space-y-2">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <ItemThumb path={item.product_image} alt={item.product_name} className="size-12" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">Qty {item.quantity} × {formatPrice(Number(item.unit_price))}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatPrice(Number(item.line_total))}</p>
                    </li>
                  ))}
                </ul>

                <dl className="mt-3 grid gap-2 rounded-xl bg-muted/60 p-3 text-xs sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">Customer</dt><dd className="font-semibold">{order.customer_name}</dd></div>
                  <div><dt className="text-muted-foreground">Phone</dt><dd className="font-semibold">{order.customer_phone}</dd></div>
                  <div><dt className="text-muted-foreground">University</dt><dd className="font-semibold">{universities.find((u) => u.slug === order.university_slug)?.name ?? order.university_slug}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-muted-foreground">Delivery</dt><dd className="font-semibold">{order.delivery_address}</dd></div>
                  {order.note && <div className="sm:col-span-2"><dt className="text-muted-foreground">Note</dt><dd className="font-semibold">{order.note}</dd></div>}
                </dl>

                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Product total</span><span className="font-semibold">{formatPrice(Number(order.subtotal))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatPrice(Number(order.shipping_fee))}</span></div>
                  <div className="flex justify-between text-sm font-bold"><span>Order total</span><span>{formatPrice(Number(order.total))}</span></div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </SellerShell>
  );
}
