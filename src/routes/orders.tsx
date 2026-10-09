import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Package } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { ItemThumb } from "@/components/commerce/ItemThumb";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { orderStatusMeta, shortOrderId, useBuyerOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Orders — DIU CampusCart" },
      { name: "description", content: "Track your campus pickups and deliveries." },
      { property: "og:title", content: "Orders — DIU CampusCart" },
      { property: "og:description", content: "Track your campus pickups and deliveries." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user, loading } = useAuth();
  const { data: orders = [], isLoading } = useBuyerOrders(user?.id);

  return (
    <SiteLayout>
      <div className="container-page py-6">
        <BackButton className="mb-3" />
        <h1 className="text-2xl font-extrabold">My orders</h1>

        {loading || (user && isLoading) ? (
          <div className="mt-10 grid place-items-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="card-surface mt-6 p-8 text-center">
            <p className="font-semibold">Log in to see your orders</p>
            <Button asChild size="sm" className="mt-4">
              <Link to="/auth" search={{ mode: "login" }}>Log in</Link>
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="card-surface mt-6 grid place-items-center gap-3 p-10 text-center">
            <Package className="size-8 text-primary" aria-hidden="true" />
            <p className="font-semibold">No orders yet</p>
            <Button asChild size="sm">
              <Link to="/products" search={{}}>Start shopping</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {orders.map((order) => {
              const meta = orderStatusMeta[order.status];
              return (
                <li key={order.id} className="card-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">{shortOrderId(order.id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}>{meta.label}</span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {order.order_items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3">
                        <ItemThumb path={item.product_image} alt={item.product_name} className="size-12" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} × {formatPrice(Number(item.unit_price))}</p>
                        </div>
                        <p className="text-sm font-semibold">{formatPrice(Number(item.line_total))}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(Number(order.subtotal))}</span></div>
                    <div className="flex justify-between text-sm font-bold"><span>Total</span><span>{formatPrice(Number(order.subtotal))}</span></div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
