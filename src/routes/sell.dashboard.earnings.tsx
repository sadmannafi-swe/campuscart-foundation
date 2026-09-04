import { createFileRoute } from "@tanstack/react-router";
import { SellerShell } from "@/components/seller/SellerShell";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/sell/dashboard/earnings")({
  component: SellerEarnings,
});

function SellerEarnings() {
  const cards = [
    { label: "Total Earnings", value: formatPrice(0) },
    { label: "This Month", value: formatPrice(0) },
    { label: "Pending Payout", value: formatPrice(0) },
    { label: "Completed Orders", value: "0" },
  ];
  return (
    <SellerShell title="Earnings">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-surface p-3">
            <p className="text-lg font-extrabold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="card-surface mt-4 px-4 py-10 text-center text-sm text-muted-foreground">
        Earnings history will appear here after your first sale.
      </div>
    </SellerShell>
  );
}
