import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, EyeOff, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  storeStatusMeta,
  useUniversities,
  type Seller,
  type Store,
  type StoreStatus,
} from "@/lib/seller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Seller Applications — CampusCart Admin" },
      {
        name: "description",
        content: "Review, approve, reject or unpublish CampusCart seller stores.",
      },
      { property: "og:title", content: "Seller Applications — CampusCart Admin" },
      {
        property: "og:description",
        content: "Internal review console for CampusCart seller and store applications.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReview,
});

interface Application {
  store: Store;
  seller: Seller | null;
  studentId: string | null;
}

const tabs: Array<{ id: StoreStatus; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "suspended", label: "Unpublished" },
];

function useIsAdmin() {
  const { user, loading } = useAuth();
  const query = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  return { isAdmin: query.data === true, checking: loading || query.isLoading, user };
}

function useApplications() {
  return useQuery({
    queryKey: ["admin-applications"],
    queryFn: async (): Promise<Application[]> => {
      const { data: stores, error } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = stores ?? [];
      if (list.length === 0) return [];

      const sellerIds = [...new Set(list.map((s) => s.seller_id))];
      const { data: sellers } = await supabase.from("sellers").select("*").in("id", sellerIds);
      const { data: ids } = await supabase
        .from("seller_identity")
        .select("seller_id, student_id")
        .in("seller_id", sellerIds);

      return list.map((store) => ({
        store,
        seller: sellers?.find((s) => s.id === store.seller_id) ?? null,
        studentId: ids?.find((i) => i.seller_id === store.seller_id)?.student_id ?? null,
      }));
    },
  });
}

function AdminReview() {
  const { isAdmin, checking, user } = useIsAdmin();
  const [tab, setTab] = useState<StoreStatus>("pending");
  const { data: applications = [], isLoading } = useApplications();
  const { data: universities = [] } = useUniversities();
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: async ({
      store,
      status,
      reason,
    }: {
      store: Store;
      status: StoreStatus;
      reason?: string | null;
    }) => {
      const { error } = await supabase
        .from("stores")
        .update({
          status,
          rejection_reason: status === "rejected" ? (reason ?? null) : null,
          approved_at: status === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", store.id);
      if (error) throw error;
      const { error: sellerError } = await supabase
        .from("sellers")
        .update({ status })
        .eq("id", store.seller_id);
      if (sellerError) throw sellerError;
    },
    onSuccess: () => {
      toast.success("Application updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update application."),
  });

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="card-surface max-w-sm p-6 text-center">
          <ShieldCheck className="mx-auto size-10 text-primary" aria-hidden="true" />
          <h1 className="mt-3 text-base font-bold">Admin access only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This console is limited to CampusCart administrators.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link to="/">Back to CampusCart</Link>
          </Button>
        </div>
      </div>
    );
  }

  const visible = applications.filter((a) => a.store.status === tab);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-xl font-extrabold">Seller Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify student sellers and control which stores are public in each university
          marketplace.
        </p>

        <div className="mt-5 flex gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const count = applications.filter((a) => a.store.status === t.id).length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="mt-8 grid place-items-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && visible.length === 0 && (
          <p className="card-surface mt-5 p-8 text-center text-sm text-muted-foreground">
            No {tabs.find((t) => t.id === tab)?.label.toLowerCase()} applications.
          </p>
        )}

        <ul className="mt-5 space-y-3">
          {visible.map(({ store, seller, studentId }) => {
            const uni = universities.find((u) => u.slug === store.university_slug);
            const meta = storeStatusMeta[store.status];
            return (
              <li key={store.id} className="card-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{store.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {uni?.name ?? store.university_slug} · {store.category}
                    </p>
                  </div>
                  <span
                    className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}
                  >
                    {meta.label}
                  </span>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">{store.description}</p>

                <dl className="mt-3 grid gap-2 rounded-xl bg-muted/60 p-3 text-xs sm:grid-cols-2">
                  <Detail label="Seller" value={seller?.full_name ?? "—"} />
                  <Detail label="Email" value={seller?.email ?? "—"} />
                  <Detail label="Phone" value={store.contact_number} />
                  <Detail label="Student ID (admin only)" value={studentId ?? "—"} />
                  <Detail label="Department" value={seller?.department ?? "—"} />
                  <Detail label="Batch" value={seller?.batch ?? "—"} />
                </dl>

                <div className="mt-3 flex flex-wrap gap-2">
                  {store.status !== "approved" && (
                    <Button
                      size="sm"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ store, status: "approved" })}
                    >
                      <CheckCircle2 className="mr-1.5 size-4" aria-hidden="true" />
                      Approve
                    </Button>
                  )}
                  {store.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={update.isPending}
                      onClick={() => {
                        const reason = window.prompt("Reason for rejection (shown to the seller)");
                        if (reason === null) return;
                        update.mutate({ store, status: "rejected", reason: reason.trim() || null });
                      }}
                    >
                      <XCircle className="mr-1.5 size-4" aria-hidden="true" />
                      Reject
                    </Button>
                  )}
                  {store.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ store, status: "suspended" })}
                    >
                      <EyeOff className="mr-1.5 size-4" aria-hidden="true" />
                      Unpublish
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}
