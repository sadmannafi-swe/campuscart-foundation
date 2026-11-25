import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useSellerAccount } from "@/lib/seller";

export const Route = createFileRoute("/sell/dashboard")({
  ssr: false,
  component: SellerDashboardLayout,
});

/**
 * Published stores use the dashboard; so does a store unpublished only for an unpaid
 * platform fee, so the seller can still see their orders and pay.
 */
const canUseDashboard = (store: { status: string; fee_suspension?: unknown }) =>
  store.status === "approved" || (store.status === "suspended" && !!store.fee_suspension);

function SellerDashboardLayout() {
  const navigate = useNavigate();
  const { user, seller, store, isLoading, authLoading } = useSellerAccount();

  useEffect(() => {
    if (authLoading || isLoading) return;
    if (!user) void navigate({ to: "/sell/login", replace: true });
    else if (!seller || !store) void navigate({ to: "/sell/register", replace: true });
    else if (!canUseDashboard(store)) void navigate({ to: "/sell/status", replace: true });
  }, [authLoading, isLoading, user, seller, store, navigate]);

  if (authLoading || isLoading || !store || !canUseDashboard(store)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return <Outlet />;
}
