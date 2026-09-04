import { createFileRoute } from "@tanstack/react-router";
import { SellerShell, SellerPlaceholder } from "@/components/seller/SellerShell";

export const Route = createFileRoute("/sell/dashboard/notifications")({
  component: SellerNotifications,
});

function SellerNotifications() {
  return (
    <SellerShell title="Notifications">
      <SellerPlaceholder
        title="You're all caught up"
        description="Store approval updates, order alerts and admin messages will show up here."
      />
    </SellerShell>
  );
}
