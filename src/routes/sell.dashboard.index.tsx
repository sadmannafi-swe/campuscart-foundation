import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Package, Receipt, TrendingUp } from "lucide-react";
import { SellerShell, StoreAvatar } from "@/components/seller/SellerShell";
import { storeStatusMeta, useSellerAccount, useSellerProducts, useUniversities } from "@/lib/seller";
import { useAuth } from "@/lib/auth";
import { orderStatusMeta, orderStatuses, shortOrderId, useSellerOrders, type OrderStatus } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sell/dashboard/")({
  component: DashboardOverview,
});

const statusDots: Record<OrderStatus, string> = {
  pending: "bg-warning",
  confirmed: "bg-primary",
  processing: "bg-primary",
  shipped: "bg-primary",
  delivered: "bg-accent",
  cancelled: "bg-destructive",
};

function DashboardOverview() {
  const { user } = useAuth();
  const { store } = useSellerAccount();
  const { data: products = [] } = useSellerProducts(store?.id);
  const { data: orders = [] } = useSellerOrders(user?.id);
  const { data: universities = [] } = useUniversities();
  const uni = universities.find((u) => u.slug === store?.university_slug);
  const meta = store ? storeStatusMeta[store.status] : null;

  const totalSales = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + Number(o.subtotal), 0);
  const statusCounts = Object.fromEntries(
    orderStatuses.map((s) => [s, orders.filter((o) => o.status === s).length]),
  ) as Record<OrderStatus, number>;
  const recentOrders = orders.slice(0, 3);

  const stats = [
    { label: "Total Sales", value: formatPrice(totalSales), icon: TrendingUp },
    { label: "Orders", value: String(orders.length), icon: Receipt },
    { label: "Products", value: String(products.length), icon: Package },
    { label: "Views", value: "0", icon: Eye },
  ];

  return (
    <SellerShell title="Dashboard">
      <div className="card-surface flex items-center gap-3 p-4">
        <StoreAvatar logoPath={store?.logo_path ?? null} name={store?.name ?? "CC"} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{store?.name}</p>
          <p className="text-xs text-muted-foreground">{uni?.short_name ?? store?.university_slug}</p>
        </div>
        {meta && (
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}>
            {meta.label}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-sm font-bold">Overview</h2>
        <span className="text-xs text-muted-foreground">All time</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card-surface p-3">
            <Icon className="size-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-lg font-extrabold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {orderStatuses.map((s) => (
          <div key={s} className="card-surface flex items-center gap-2 p-2.5">
            <span className={cn("size-2 shrink-0 rounded-full", statusDots[s])} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-tight">{statusCounts[s]}</p>
              <p className="truncate text-[11px] text-muted-foreground">{orderStatusMeta[s].label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-bold">Recent Orders</h2>
        <Link to="/sell/dashboard/orders" className="text-xs font-semibold text-primary">
          View All
        </Link>
      </div>
      {recentOrders.length === 0 ? (
        <div className="card-surface mt-3 px-4 py-10 text-center text-sm text-muted-foreground">
          No orders yet. Orders will appear here once students start buying.
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {recentOrders.map((order) => (
            <li key={order.id} className="card-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{shortOrderId(order.id)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.order_items.map((i) => `${i.product_name} × ${i.quantity}`).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", orderStatusMeta[order.status].className)}>
                    {orderStatusMeta[order.status].label}
                  </span>
                  <span className="text-sm font-bold">{formatPrice(Number(order.subtotal))}</span>
                </div>
              </div>
              <Link
                to="/sell/dashboard/orders"
                search={{ order: order.id }}
                className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
              >
                Open order
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SellerShell>
  );
}
