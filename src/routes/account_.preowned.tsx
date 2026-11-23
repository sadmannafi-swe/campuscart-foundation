import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PreOwnedListing } from "@shared/types";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EmptyState } from "@/components/common/StateBlocks";
import {
  LoginPrompt,
  ModuleHeader,
  StatusPill,
  accent,
  formatDay,
} from "@/components/modules/ModuleKit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiPatch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { useMyPreOwned, useRefreshModules } from "@/lib/modules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account_/preowned")({
  head: () => ({
    meta: [{ title: "My Pre-Owned Listings — CampusCart" }, { name: "robots", content: "noindex" }],
  }),
  component: MyPreOwned,
});

function MyPreOwned() {
  const { user, loading } = useAuth();
  const { data = [], isLoading } = useMyPreOwned(!!user);
  const [tab, setTab] = useState<"available" | "sold">("available");
  const list = data.filter((l) => l.status === tab);

  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <ModuleHeader
          tone="preowned"
          icon={ShoppingBag}
          eyebrow="Profile"
          title="My Pre-Owned Listings"
          actions={
            <Button asChild className={accent.preowned.button}>
              <Link to="/preowned/new">
                <Plus /> Create new listing
              </Link>
            </Button>
          }
        />
        {loading ? null : !user ? (
          <LoginPrompt text="Log in to see your Pre-Owned listings." />
        ) : (
          <>
            <div
              role="tablist"
              className="mb-4 inline-flex rounded-full border border-border bg-surface p-1"
            >
              {(["available", "sold"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    tab === t
                      ? "bg-ink text-ink-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "available" ? "Available" : "Sold"} (
                  {data.filter((l) => l.status === t).length})
                </button>
              ))}
            </div>
            {isLoading ? (
              <Skeleton className="h-40 rounded-[16px]" />
            ) : list.length === 0 ? (
              <EmptyState
                title={tab === "available" ? "No available listings" : "Nothing sold yet"}
                {...(tab === "available" && { description: "List something you no longer need." })}
              />
            ) : (
              <ul className="space-y-3">
                {list.map((l) => (
                  <MyRow key={l.id} l={l} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}

function MyRow({ l }: { l: PreOwnedListing }) {
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
        to="/preowned/$listingId"
        params={{ listingId: l.id }}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <img src={l.images[0]} alt="" className="size-16 shrink-0 rounded-[12px] object-cover" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{l.title}</span>
          <span className="block text-sm tabular-nums">{formatPrice(l.price)}</span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <StatusPill status={l.status} />
            {l.moderation === "hidden" && <StatusPill status="hidden" tone="bad" />}
            Listed {formatDay(l.created_at)}
          </span>
        </span>
      </Link>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            act(
              () =>
                apiPatch(`/preowned/${l.id}/status`, {
                  status: l.status === "sold" ? "available" : "sold",
                }),
              l.status === "sold" ? "Marked available" : "Marked as sold",
            )
          }
        >
          {l.status === "sold" ? "Mark available" : "Mark sold"}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/preowned/$listingId/edit" params={{ listingId: l.id }} aria-label="Edit">
            <Pencil />
          </Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Delete"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Delete this listing? This can't be undone."))
              void act(() => apiDelete(`/preowned/${l.id}`), "Listing deleted");
          }}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
