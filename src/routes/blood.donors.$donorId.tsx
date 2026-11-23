import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, MapPin, Pencil, Phone } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState } from "@/components/common/StateBlocks";
import {
  ContactButton,
  Fact,
  ReportButton,
  StatusPill,
  formatDay,
} from "@/components/modules/ModuleKit";
import { BloodGroupBadge, BloodNotice } from "@/components/modules/blood/BloodKit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDonor } from "@/lib/modules";

export const Route = createFileRoute("/blood/donors/$donorId")({
  head: () => ({ meta: [{ title: "Blood donor — CampusCart" }] }),
  component: DonorDetail,
});

function DonorDetail() {
  const { donorId } = Route.useParams();
  const { data: d, isLoading, isError } = useDonor(donorId);
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-6 sm:py-10">
        <BackButton className="mb-4" />
        {isLoading ? (
          <Skeleton className="h-80 rounded-[20px]" />
        ) : isError || !d ? (
          <EmptyState
            title="This donor profile isn't available"
            action={
              <Button asChild size="sm">
                <Link to="/blood" search={{ tab: "donors" }}>
                  Available donors
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="card-surface p-5 animate-rise sm:p-7">
            <div className="flex items-center gap-4">
              <BloodGroupBadge group={d.blood_group} size="lg" />
              <div className="min-w-0">
                <StatusPill
                  status={d.availability === "available" ? "available" : "unavailable"}
                  tone={d.availability === "available" ? "good" : "muted"}
                />
                <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em]">
                  {d.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Registered donor · updated {formatDay(d.updated_at)}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid gap-2 sm:grid-cols-2">
              <Fact label="Blood group">{d.blood_group}</Fact>
              <Fact label="Current location">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden="true" />
                  {d.location}
                </span>
              </Fact>
              {(d.department || d.batch) && (
                <Fact label="Department and batch">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="size-4" aria-hidden="true" />
                    {[d.department, d.batch].filter(Boolean).join(" · ")}
                  </span>
                </Fact>
              )}
              {d.contact_phone && (
                <Fact label="Phone (shared by the donor)">
                  <a
                    href={`tel:${d.contact_phone}`}
                    className="inline-flex items-center gap-1.5 underline decoration-blood underline-offset-4"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {d.contact_phone}
                  </a>
                </Fact>
              )}
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              {d.is_owner ? (
                <Button asChild>
                  <Link to="/blood/donor">
                    <Pencil /> Edit donor profile
                  </Link>
                </Button>
              ) : (
                <ContactButton
                  kind="donor"
                  id={d.id}
                  label="Contact donor"
                  tone="blood"
                  disabled={d.availability !== "available"}
                />
              )}
            </div>
            <BloodNotice className="mt-6" />
            {!d.is_owner && (
              <div className="mt-4 text-right">
                <ReportButton kind="donor" id={d.id} />
              </div>
            )}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
