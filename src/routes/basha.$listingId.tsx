import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ExternalLink,
  GraduationCap,
  Home,
  Lock,
  MapPin,
  Pencil,
  Users,
} from "lucide-react";
import { BASHA_TYPE_LABELS, type BashaFacilityKey } from "@shared/types";
import { UNIVERSITIES } from "@shared/universities";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState } from "@/components/common/StateBlocks";
import {
  ContactButton,
  Fact,
  Gallery,
  ReportButton,
  StatusPill,
  formatDay,
} from "@/components/modules/ModuleKit";
import { FACILITY_META } from "@/components/modules/basha/BashaKit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { useBashaListing } from "@/lib/modules";

export const Route = createFileRoute("/basha/$listingId")({
  head: () => ({ meta: [{ title: "BashaLagbe listing — CampusCart" }] }),
  component: BashaDetail,
});

/** A map preview only for real Google Maps links, opened in Google's own embed. */
function mapEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const q = u.searchParams.get("q") ?? u.pathname.match(/\/place\/([^/]+)/)?.[1] ?? null;
    if (!q) return null;
    return `https://www.google.com/maps?q=${encodeURIComponent(decodeURIComponent(q).replace(/\+/g, " "))}&output=embed`;
  } catch {
    return null;
  }
}

function BashaDetail() {
  const { listingId } = Route.useParams();
  const { data: l, isLoading, isError } = useBashaListing(listingId);
  const facilities = l ? (Object.keys(FACILITY_META) as BashaFacilityKey[]) : [];
  const embed = l?.map_url ? mapEmbed(l.map_url) : null;

  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <BackButton className="mb-4" />
        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="aspect-4/3 rounded-[20px]" />
            <Skeleton className="h-96 rounded-[20px]" />
          </div>
        ) : isError || !l ? (
          <EmptyState
            title="This listing isn't available"
            action={
              <Button asChild size="sm">
                <Link to="/basha">BashaLagbe</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
            <div className="space-y-6">
              <Gallery images={l.images} alt={l.title} />
              <section>
                <h2 className="font-display text-lg font-semibold">About this place</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {l.description}
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-semibold">Facilities</h2>
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {facilities.map((k) => {
                    const { icon: Icon, label } = FACILITY_META[k];
                    const on = l.facilities[k];
                    const extra =
                      k === "attached_bathroom" && on && l.facilities.bathroom_type
                        ? ` (${l.facilities.bathroom_type})`
                        : k === "kitchen" && on && l.facilities.kitchen_type
                          ? ` (${l.facilities.kitchen_type})`
                          : "";
                    return (
                      <li
                        key={k}
                        className={
                          on
                            ? "flex items-center gap-2 rounded-[12px] bg-basha-soft px-3 py-2 text-sm text-basha"
                            : "flex items-center gap-2 rounded-[12px] border border-dashed border-border px-3 py-2 text-sm text-muted-foreground line-through decoration-muted-foreground/40"
                        }
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="sr-only">{on ? "Has" : "No"} </span>
                        {label}
                        {extra}
                      </li>
                    );
                  })}
                </ul>
                {l.facilities.other && (
                  <p className="mt-3 text-sm">
                    <span className="font-medium">Also: </span>
                    <span className="text-muted-foreground">{l.facilities.other}</span>
                  </p>
                )}
                {l.facilities.rules && (
                  <p className="mt-2 text-sm">
                    <span className="font-medium">House rules: </span>
                    <span className="text-muted-foreground">{l.facilities.rules}</span>
                  </p>
                )}
              </section>
              {l.roommate && (
                <section>
                  <h2 className="font-display text-lg font-semibold">Roommate details</h2>
                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    <Fact label="Available seats">{l.roommate.available_seats}</Fact>
                    <Fact label="Current roommates">{l.roommate.current_roommates}</Fact>
                    {l.roommate.preferred_type && (
                      <Fact label="Preferred roommate">{l.roommate.preferred_type}</Fact>
                    )}
                    {l.roommate.gender_preference && (
                      <Fact label="Gender preference">{l.roommate.gender_preference}</Fact>
                    )}
                    {l.roommate.department_preference && (
                      <Fact label="Department / student">{l.roommate.department_preference}</Fact>
                    )}
                  </dl>
                  {l.roommate.requirements && (
                    <p className="mt-2 text-sm text-muted-foreground">{l.roommate.requirements}</p>
                  )}
                </section>
              )}
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="card-surface p-5 animate-rise">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-basha-soft px-2.5 py-1 text-xs font-medium text-basha">
                    <Home className="size-3.5" aria-hidden="true" />
                    {BASHA_TYPE_LABELS[l.type]}
                  </span>
                  <StatusPill status={l.status} />
                  {l.moderation === "hidden" && <StatusPill status="hidden" tone="bad" />}
                </div>
                <h1 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em]">
                  {l.title}
                </h1>
                <p className="mt-3">
                  <span className="price-lg text-3xl">{formatPrice(l.rent)}</span>
                  <span className="text-sm text-muted-foreground"> / month</span>
                </p>
                {l.advance ? (
                  <p className="text-sm text-muted-foreground">Advance {formatPrice(l.advance)}</p>
                ) : null}
                <dl className="mt-4 grid gap-2">
                  <Fact label="Area">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4" aria-hidden="true" />
                      {l.area}
                    </span>
                  </Fact>
                  <Fact label="University">
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="size-4" aria-hidden="true" />
                      {UNIVERSITIES.find((u) => u.slug === l.university_slug)?.name ??
                        l.university_slug}
                    </span>
                  </Fact>
                  <Fact label="Available from">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4" aria-hidden="true" />
                      {formatDay(l.available_from)}
                    </span>
                  </Fact>
                  <Fact label="Address">
                    {l.address ? (
                      l.address
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Lock className="size-4" aria-hidden="true" />
                        Shared by the owner in messages
                      </span>
                    )}
                  </Fact>
                  <Fact label="Listed by">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-4" aria-hidden="true" />
                      {l.owner.name}
                    </span>
                  </Fact>
                </dl>
                <div className="mt-5 flex flex-wrap gap-2">
                  {l.is_owner ? (
                    <>
                      <Button asChild size="lg">
                        <Link to="/basha/$listingId/edit" params={{ listingId: l.id }}>
                          <Pencil /> Edit listing
                        </Link>
                      </Button>
                      <Button asChild size="lg" variant="outline">
                        <Link to="/account/basha">Manage</Link>
                      </Button>
                    </>
                  ) : (
                    <ContactButton
                      kind="basha"
                      id={l.id}
                      label={l.status === "available" ? "Message owner" : "Not available"}
                      tone="basha"
                      disabled={l.status !== "available"}
                      className="flex-1"
                    />
                  )}
                </div>
                {!l.is_owner && (
                  <div className="mt-4 text-right">
                    <ReportButton kind="basha" id={l.id} />
                  </div>
                )}
              </div>

              {l.map_url && (
                <div className="mt-4 overflow-hidden rounded-[18px] border border-border bg-surface">
                  {embed && (
                    <iframe
                      title="Map preview"
                      src={embed}
                      className="aspect-[16/10] w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-same-origin allow-popups"
                    />
                  )}
                  <a
                    href={l.map_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted"
                  >
                    Open in Google Maps <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
