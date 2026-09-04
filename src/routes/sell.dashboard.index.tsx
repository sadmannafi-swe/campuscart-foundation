import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Package, Receipt, TrendingUp } from "lucide-react";
import { SellerShell, StoreAvatar } from "@/components/seller/SellerShell";
import { storeStatusMeta, useSellerAccount, useSellerProducts, useUniversities } from "@/lib/seller";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sell/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { store } = useSellerAccount();
  const { data: products = [] } = useSellerProducts(store?.id);
  const { data: universities = [] } = useUniversities();
  const uni = universities.find((u) => u.slug === store?.university_slug);
  const meta = store ? storeStatusMeta[store.status] : null;

  const stats = [
    { label: "Total Sales", value: formatPrice(0), icon: TrendingUp },
    { label: "Orders", value: "0", icon: Receipt },
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
        <span className="text-xs text-muted-foreground">This Month</span>
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

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-bold">Recent Orders</h2>
        <Link to="/sell/dashboard/orders" className="text-xs font-semibold text-primary">
          View All
        </Link>
      </div>
      <div className="card-surface mt-3 px-4 py-10 text-center text-sm text-muted-foreground">
        No orders yet. Orders will appear here once students start buying.
      </div>
    </SellerShell>
  );
}
