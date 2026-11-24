import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplet, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EmptyState } from "@/components/common/StateBlocks";
import {
  LoginPrompt,
  ModuleHeader,
  StatusPill,
  accent,
  formatDay,
} from "@/components/modules/ModuleKit";
import { BloodGroupBadge } from "@/components/modules/blood/BloodKit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiPatch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMyBloodRequests, useMyDonorProfile, useRefreshModules } from "@/lib/modules";

export const Route = createFileRoute("/account_/blood")({
  head: () => ({
    meta: [{ title: "My Blood Requests — CampusCart" }, { name: "robots", content: "noindex" }],
  }),
  component: MyBlood,
});

function MyBlood() {
  const { user, loading } = useAuth();
  const requests = useMyBloodRequests(!!user);
  const donor = useMyDonorProfile(!!user);
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
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <ModuleHeader
          tone="blood"
          icon={Droplet}
          eyebrow="Profile"
          title="My Blood Donation"
          actions={
            <Button asChild className={accent.blood.button}>
              <Link to="/blood/requests/new">
                <Plus /> Request blood
              </Link>
            </Button>
          }
        />
        {loading ? null : !user ? (
          <LoginPrompt text="Log in to manage your blood requests and donor profile." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">My Blood Requests</h2>
              {requests.isLoading ? (
                <Skeleton className="h-32 rounded-[16px]" />
              ) : (requests.data ?? []).length === 0 ? (
                <EmptyState title="No requests" description="Requests you post will show here." />
              ) : (
                <ul className="space-y-3">
                  {requests.data!.map((r) => (
                    <li
                      key={r.id}
                      className="card-surface flex flex-wrap items-center gap-3 p-3 animate-rise"
                    >
                      <BloodGroupBadge group={r.blood_group} />
                      <Link
                        to="/blood/requests/$requestId"
                        params={{ requestId: r.id }}
                        className="min-w-0 flex-1"
                      >
                        <span className="block truncate text-sm font-medium">
                          {r.hospital_name}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <StatusPill status={r.status} />
                          {r.moderation === "hidden" && <StatusPill status="hidden" tone="bad" />}
                          Needed {formatDay(r.needed_on)}
                        </span>
                      </Link>
                      <div className="flex gap-1.5">
                        {r.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              act(
                                () =>
                                  apiPatch(`/blood/requests/${r.id}/status`, {
                                    status: "fulfilled",
                                  }),
                                "Marked fulfilled",
                              )
                            }
                          >
                            Fulfilled
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              act(
                                () =>
                                  apiPatch(`/blood/requests/${r.id}/status`, { status: "active" }),
                                "Reopened",
                              )
                            }
                          >
                            Reopen
                          </Button>
                        )}
                        {r.status === "active" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              act(
                                () =>
                                  apiPatch(`/blood/requests/${r.id}/status`, {
                                    status: "cancelled",
                                  }),
                                "Cancelled",
                              )
                            }
                          >
                            Cancel
                          </Button>
                        )}
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            to="/blood/requests/$requestId/edit"
                            params={{ requestId: r.id }}
                            aria-label="Edit"
                          >
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
                            window.confirm("Delete this request?") &&
                            void act(() => apiDelete(`/blood/requests/${r.id}`), "Request deleted")
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">My Donor Profile</h2>
              {donor.isLoading ? (
                <Skeleton className="h-40 rounded-[16px]" />
              ) : !donor.data ? (
                <EmptyState
                  title="You're not registered as a donor"
                  action={
                    <Button asChild size="sm" className={accent.blood.button}>
                      <Link to="/blood/donor">Become a donor</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="card-surface space-y-4 p-4 animate-rise">
                  <div className="flex items-center gap-3">
                    <BloodGroupBadge group={donor.data.blood_group} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{donor.data.name}</p>
                      <p className="text-xs text-muted-foreground">{donor.data.location}</p>
                    </div>
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-[12px] border border-border px-3 py-2.5 text-sm">
                    Available to donate
                    <input
                      type="checkbox"
                      role="switch"
                      className="size-5 accent-[var(--color-blood)]"
                      checked={donor.data.availability === "available"}
                      disabled={busy}
                      onChange={(e) =>
                        act(
                          () =>
                            apiPatch("/blood/donors/me/availability", {
                              availability: e.target.checked ? "available" : "unavailable",
                            }),
                          e.target.checked
                            ? "You're marked available"
                            : "Marked temporarily unavailable",
                        )
                      }
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/blood/donor">
                        <Pencil /> Edit
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() =>
                        window.confirm("Remove your donor profile?") &&
                        void act(() => apiDelete("/blood/donors/me"), "Donor profile removed")
                      }
                    >
                      <Trash2 /> Remove profile
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
