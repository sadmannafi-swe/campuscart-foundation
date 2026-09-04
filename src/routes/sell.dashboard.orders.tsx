import { createFileRoute } from "@tanstack/react-router";
import { SellerShell, SellerPlaceholder } from "@/components/seller/SellerShell";

export const Route = createFileRoute("/sell/dashboard/orders")({
  component: SellerOrders,
});

function SellerOrders() {
  return (
    <SellerShell title="Orders">
      <SellerPlaceholder
        title="No orders yet"
        description="Orders placed for your store's products will appear here with their status and buyer details."
      />
    </SellerShell>
  );
}
