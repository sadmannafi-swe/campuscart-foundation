import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { BashaListing, BashaStatus } from "@shared/types";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EmptyState } from "@/components/common/StateBlocks";
import { LoginPrompt, ModuleHeader, StatusPill, accent } from "@/components/modules/ModuleKit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiPatch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { useMyBasha, useRefreshModules } from "@/lib/modules";

export const Route = createFileRoute("/account_/basha")({
  head: () => ({
    meta: [
      { title: "My BashaLagbe Listings — CampusCart" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyBasha,
});

function MyBasha() {
  const { user, loading } = useAuth();
  const { data = [], isLoading } = useMyBasha(!!user);
  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <ModuleHeader
          tone="basha"
          icon={Home}
          eyebrow="Profile"
          title="My BashaLagbe Listings"
          actions={
            <Button asChild className={accent.basha.button}>
              <Link to="/basha/new">
                <Plus /> List a place
              </Link>
            </Button>
          }
        />
        {loading ? null : !user ? (
          <LoginPrompt text="Log in to manage your housing listings." />
        ) : isLoading ? (
          <Skeleton className="h-40 rounded-[16px]" />
        ) : data.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="List a room, a seat or an apartment near campus."
          />
        ) : (
          <ul className="space-y-3">
            {data.map((l) => (
              <Row key={l.id} l={l} />
            ))}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}

function Row({ l }: { l: BashaListing }) {
  const refresh = useRefreshModules();
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
      toast.success(done);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="card-surface flex flex-wrap items-center gap-3 p-3 animate-rise">
      <Link
        to="/basha/$listingId"
        params={{ listingId: l.id }}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <img src={l.images[0]} alt="" className="h-16 w-24 shrink-0 rounded-[12px] object-cover" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{l.title}</span>
          <span className="block text-sm tabular-nums">
            {formatPrice(l.rent)}/month · {l.area}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <StatusPill status={l.status} />
            {l.moderation === "hidden" && <StatusPill status="hidden" tone="bad" />}
          </span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <select
          aria-label="Status"
          disabled={busy}
          value={l.status}
          onChange={(e) =>
            act(
              () => apiPatch(`/basha/${l.id}/status`, { status: e.target.value as BashaStatus }),
              "Status updated",
            )
          }
          className="h-8 rounded-[8px] border border-input bg-surface px-2 text-xs"
        >
          <option value="available">Available</option>
          <option value="rented">Rented</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <Button asChild size="sm" variant="ghost">
          <Link to="/basha/$listingId/edit" params={{ listingId: l.id }} aria-label="Edit">
            <Pencil />
          </Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Delete"
          disabled={busy}
          className="text-destructive hover:text-destructive"
          onClick={() =>
            window.confirm("Delete this listing?") &&
            void act(() => apiDelete(`/basha/${l.id}`), "Listing deleted")
          }
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
