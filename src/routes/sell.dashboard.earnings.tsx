import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { SellerEarnings as Earnings } from "@shared/types";
import { SellerShell } from "@/components/seller/SellerShell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { shortOrderId } from "@/lib/orders";

export const Route = createFileRoute("/sell/dashboard/earnings")({
  component: SellerEarnings,
});

function SellerEarnings() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["seller-earnings", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: () => api<Earnings>("/seller/earnings"),
  });

  const cards = [
    { label: "Total Earnings", value: formatPrice(data?.total_earnings ?? 0) },
    { label: "This Month", value: formatPrice(data?.this_month ?? 0) },
    { label: "Awaiting Delivery", value: formatPrice(data?.awaiting_delivery ?? 0) },
    { label: "Completed Orders", value: String(data?.delivered_orders ?? 0) },
  ];

  return (
    <SellerShell title="Earnings">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-surface p-3">
            <p className="text-lg font-semibold">{isLoading ? "…" : c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Earnings count delivered orders only. Orders still in progress appear under Awaiting
        Delivery; cancelled orders are excluded.
      </p>

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="card-surface mt-4 px-4 py-10 text-center text-sm text-destructive">
          Couldn't load your earnings. Please refresh.
        </div>
      ) : !data || data.transactions.length === 0 ? (
        <div className="card-surface mt-4 px-4 py-10 text-center text-sm text-muted-foreground">
          Earnings history will appear here after your first delivered order.
        </div>
      ) : (
        <ul className="card-surface mt-4 divide-y divide-border">
          {data.transactions.map((t) => (
            <li key={t.order_id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link
                  to="/sell/dashboard/orders"
                  search={{ order: t.order_id }}
                  className="text-sm font-semibold hover:text-primary"
                >
                  {shortOrderId(t.order_id)}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {t.items.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t.customer_name} · Delivered{" "}
                  {new Date(t.delivered_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-accent">
                {formatPrice(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SellerShell>
  );
}
