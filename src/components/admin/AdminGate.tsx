import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * Renders its children only for a CampusCart admin (checked by the server on every
 * request too — this only decides what to show). Same check as the admin console.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const access = useQuery({
    queryKey: ["admin-access", user?.id],
    enabled: !!user,
    retry: false,
    queryFn: () => api<{ isAdmin: boolean }>("/admin/access"),
  });

  if (loading || (user && access.isLoading)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || !access.data?.isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="card-surface max-w-sm p-6 text-center">
          <ShieldCheck className="mx-auto size-10 text-primary" aria-hidden="true" />
          <h1 className="mt-3 text-base font-semibold">Admin access only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user
              ? "Your account is not a CampusCart administrator."
              : "Log in with your CampusCart administrator account to continue."}
          </p>
          <Button asChild className="mt-4 w-full">
            {user ? (
              <Link to="/">Back to CampusCart</Link>
            ) : (
              <Link to="/auth" search={{ mode: "login" }}>
                Log in
              </Link>
            )}
          </Button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
