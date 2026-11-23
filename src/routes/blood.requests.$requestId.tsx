import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Hospital, MapPin, Pencil, Phone, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState } from "@/components/common/StateBlocks";
import {
  ContactButton,
  Fact,
  ReportButton,
  StatusPill,
  formatDay,
  timeAgo,
} from "@/components/modules/ModuleKit";
import { BloodGroupBadge, BloodNotice } from "@/components/modules/blood/BloodKit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiPatch } from "@/lib/api";
import { useBloodRequest, useRefreshModules } from "@/lib/modules";

export const Route = createFileRoute("/blood/requests/$requestId")({
  head: () => ({ meta: [{ title: "Blood request — CampusCart" }] }),
  component: RequestDetail,
});

function RequestDetail() {
  const { requestId } = Route.useParams();
  const { data: r, isLoading, isError } = useBloodRequest(requestId);
  const refresh = useRefreshModules();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: "active" | "fulfilled" | "cancelled") {
    setBusy(true);
    try {
      await apiPatch(`/blood/requests/${requestId}/status`, { status });
      await refresh();
      toast.success(
        status === "fulfilled"
          ? "Marked fulfilled. We're glad."
          : status === "cancelled"
            ? "Request cancelled"
            : "Request reopened",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-6 sm:py-10">
        <BackButton className="mb-4" />
        {isLoading ? (
          <Skeleton className="h-96 rounded-[20px]" />
        ) : isError || !r ? (
          <EmptyState
            title="This request isn't available"
            action={
              <Button asChild size="sm">
                <Link to="/blood">Blood Donation</Link>
              </Button>
            }
          />
        ) : (
          <div className="card-surface p-5 animate-rise sm:p-7">
            <div className="flex items-start gap-4">
              <BloodGroupBadge group={r.blood_group} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={r.status} />
                  {r.moderation === "hidden" && <StatusPill status="hidden" tone="bad" />}
                </div>
                <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em]">
                  {r.blood_group} blood needed{r.patient_name ? ` for ${r.patient_name}` : ""}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Posted {timeAgo(r.created_at)} by {r.owner.name}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid gap-2 sm:grid-cols-2">
              <Fact label="Hospital">
                <span className="inline-flex items-center gap-1.5">
                  <Hospital className="size-4" aria-hidden="true" />
                  {r.hospital_name}
                </span>
              </Fact>
              <Fact label="Location">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden="true" />
                  {r.hospital_location}
                </span>
              </Fact>
              <Fact label="Needed on">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  {formatDay(r.needed_on)}
                </span>
              </Fact>
              <Fact label="Donors needed">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" aria-hidden="true" />
                  {r.donors_needed}
                </span>
              </Fact>
              {r.contact_phone && (
                <Fact label="Phone (shared by the requester)">
                  <a
                    href={`tel:${r.contact_phone}`}
                    className="inline-flex items-center gap-1.5 underline decoration-blood underline-offset-4"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {r.contact_phone}
                  </a>
                </Fact>
              )}
            </dl>

            {r.description && (
              <section className="mt-5">
                <h2 className="text-sm font-semibold">Details</h2>
                <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">
                  {r.description}
                </p>
              </section>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {r.is_owner ? (
                <>
                  <Button asChild>
                    <Link to="/blood/requests/$requestId/edit" params={{ requestId: r.id }}>
                      <Pencil /> Edit
                    </Link>
                  </Button>
                  {r.status === "active" ? (
                    <>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => setStatus("fulfilled")}
                      >
                        Mark fulfilled
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => setStatus("cancelled")}
                      >
                        Cancel request
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" disabled={busy} onClick={() => setStatus("active")}>
                      Reopen
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm("Delete this request?")) return;
                      await apiDelete(`/blood/requests/${r.id}`);
                      await refresh();
                      toast.success("Request deleted");
                      void navigate({ to: "/account/blood" });
                    }}
                  >
                    <Trash2 /> Delete
                  </Button>
                </>
              ) : (
                <ContactButton
                  kind="blood_request"
                  id={r.id}
                  label="Contact requester"
                  tone="blood"
                  disabled={r.status !== "active"}
                />
              )}
            </div>

            <BloodNotice className="mt-6" />
            {!r.is_owner && (
              <div className="mt-4 text-right">
                <ReportButton kind="blood_request" id={r.id} />
              </div>
            )}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
