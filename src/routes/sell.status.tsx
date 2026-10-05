import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storeStatusMeta, useSellerAccount, useUniversities } from "@/lib/seller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sell/status")({
  head: () => ({
    meta: [
      { title: "Store Verification — CampusCart Seller" },
      { name: "description", content: "Track the review status of your CampusCart store." },
      { property: "og:title", content: "Store Verification — CampusCart Seller" },
      { property: "og:description", content: "Track the review status of your CampusCart store." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SellerStatus,
});

export default function SellerStatus() {
  const navigate = useNavigate();
  const { seller, store, isLoading, authLoading, user } = useSellerAccount();
  const { data: universities = [] } = useUniversities();

  useEffect(() => {
    if (authLoading || isLoading) return;
    if (!user) void navigate({ to: "/sell/login", replace: true });
    else if (!seller || !store) void navigate({ to: "/sell/register", replace: true });
  }, [authLoading, isLoading, user, seller, store, navigate]);

  if (authLoading || isLoading || !store || !seller) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const uni = universities.find((u) => u.slug === store.university_slug);
  const meta = storeStatusMeta[store.status];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 py-8">
        {store.status === "approved" ? (
          <ApprovedView storeName={store.name} uniShort={uni?.short_name ?? store.university_slug} approvedAt={store.approved_at} />
        ) : (
          <div className="text-center">
            <span className="mx-auto grid size-24 place-items-center rounded-3xl bg-primary-soft text-primary">
              <ClipboardCheck className="size-12" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-xl font-extrabold">
              {store.status === "pending" && "Your store is under review"}
              {store.status === "rejected" && "Your store was not approved"}
              {store.status === "suspended" && "Your store is unpublished"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {store.status === "pending" &&
                "Your seller account and store are currently under review by CampusCart Admin. You will be able to access your seller dashboard after approval."}
              {store.status === "rejected" &&
                (store.rejection_reason ? `Reason: ${store.rejection_reason}` :
                  "Your application did not pass verification.")}
              {store.status === "suspended" &&
                "Your store is currently hidden from the marketplace by CampusCart Admin."}
            </p>
          </div>
        )}

        <div className="card-surface mt-6 divide-y divide-border">
          <Row label="Store Name" value={store.name} />
          <Row label="University" value={uni?.short_name ?? store.university_slug} />
          <Row
            label="Status"
            value={
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}>
                {meta.label}
              </span>
            }
          />
          <Row
            label="Submitted On"
            value={new Date(store.created_at).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/sell" className="hover:text-primary">
            ← Back to seller home
          </Link>
        </p>
      </div>
    </div>
  );
}

function ApprovedView({
  storeName,
  uniShort,
  approvedAt,
}: {
  storeName: string;
  uniShort: string;
  approvedAt: string | null;
}) {
  return (
    <div className="text-center">
      <span className="mx-auto grid size-24 place-items-center rounded-3xl bg-accent-soft text-accent">
        <CheckCircle2 className="size-12" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-extrabold">Congratulations! 🎉</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your store <span className="font-semibold text-foreground">{storeName}</span> has been
        approved and is now live on {uniShort} CampusCart.
        {approvedAt ? ` Approved on ${new Date(approvedAt).toLocaleDateString("en-GB")}.` : ""}
      </p>
      <Button asChild className="mt-5 w-full">
        <Link to="/sell/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
