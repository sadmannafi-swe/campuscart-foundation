import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useSellerAccount } from "@/lib/seller";

export const Route = createFileRoute("/sell/dashboard")({
  ssr: false,
  component: SellerDashboardLayout,
});

function SellerDashboardLayout() {
  const navigate = useNavigate();
  const { user, seller, store, isLoading, authLoading } = useSellerAccount();

  useEffect(() => {
    if (authLoading || isLoading) return;
    if (!user) void navigate({ to: "/sell/login", replace: true });
    else if (!seller || !store) void navigate({ to: "/sell/register", replace: true });
    else if (store.status !== "approved") void navigate({ to: "/sell/status", replace: true });
  }, [authLoading, isLoading, user, seller, store, navigate]);

  if (authLoading || isLoading || !store || store.status !== "approved") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return <Outlet />;
}
