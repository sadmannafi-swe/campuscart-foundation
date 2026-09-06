import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, EyeOff, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listApplications,
  updateApplicationStatus,
  type AdminApplication,
} from "@/lib/adminReview.functions";
import { storeStatusMeta, useUniversities, type StoreStatus } from "@/lib/seller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ccadmingo")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CampusCart Admin Console" },
      {
        name: "description",
        content: "Private CampusCart console for reviewing seller and store applications.",
      },
      { property: "og:title", content: "CampusCart Admin Console" },
      {
        property: "og:description",
        content: "Private CampusCart console for reviewing seller and store applications.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SecretAdminConsole,
});

const tabs: Array<{ id: StoreStatus; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "suspended", label: "Unpublished" },
];

function SecretAdminConsole() {
  const [tab, setTab] = useState<StoreStatus>("pending");
  const fetchApplications = useServerFn(listApplications);
  const setStatus = useServerFn(updateApplicationStatus);
  const queryClient = useQueryClient();
  const { data: universities = [] } = useUniversities();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["cc-admin-applications"],
    queryFn: () => fetchApplications() as Promise<AdminApplication[]>,
  });

  const update = useMutation({
    mutationFn: (data: {
      storeId: string;
      sellerId: string;
      status: StoreStatus;
      reason?: string | null;
    }) => setStatus({ data }),
    onSuccess: () => {
      toast.success("Application updated.");
      void queryClient.invalidateQueries({ queryKey: ["cc-admin-applications"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update application."),
  });

  const visible = applications.filter((a) => a.store.status === tab);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-xl font-extrabold">Seller Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify student sellers and control which stores are public in each university
          marketplace.
        </p>
        <p className="mt-3 rounded-xl bg-warning/15 p-3 text-xs text-warning-foreground">
          This console is open to anyone who knows this link. Keep the address private.
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
                      onClick={() =>
                        update.mutate({
                          storeId: store.id,
                          sellerId: store.seller_id,
                          status: "approved",
                        })
                      }
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
                        update.mutate({
                          storeId: store.id,
                          sellerId: store.seller_id,
                          status: "rejected",
                          reason: reason.trim() || null,
                        });
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
                      onClick={() =>
                        update.mutate({
                          storeId: store.id,
                          sellerId: store.seller_id,
                          status: "suspended",
                        })
                      }
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

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            ← Back to CampusCart
          </Link>
        </p>
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
