import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Pencil, ShieldCheck, ShoppingBag, Tag } from "lucide-react";
import { PREOWNED_CONDITION_LABELS } from "@shared/types";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { discountPercent, formatPrice } from "@/lib/format";
import { usePreOwnedListing } from "@/lib/modules";

export const Route = createFileRoute("/preowned/$listingId")({
  head: () => ({ meta: [{ title: "Pre-Owned item — CampusCart" }] }),
  component: PreOwnedDetail,
});

function PreOwnedDetail() {
  const { listingId } = Route.useParams();
  const { data: l, isLoading, isError } = usePreOwnedListing(listingId);

  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <BackButton className="mb-4" />
        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="aspect-4/3 rounded-[20px]" />
            <Skeleton className="h-80 rounded-[20px]" />
          </div>
        ) : isError || !l ? (
          <EmptyState
            title="This item isn't available"
            description="It may have been removed by the seller."
            action={
              <Button asChild size="sm">
                <Link to="/preowned">Browse Pre-Owned</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
            <Gallery images={l.images} alt={l.title} />
            <div className="animate-rise">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-preowned-soft px-2.5 py-1 text-xs font-medium text-preowned">
                  <ShoppingBag className="size-3.5" aria-hidden="true" /> Pre-Owned
                </span>
                <StatusPill status={l.status} />
                {l.moderation === "hidden" && <StatusPill status="hidden" tone="bad" />}
              </div>
              <h1 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                {l.title}
              </h1>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="price-lg text-3xl">{formatPrice(l.price)}</span>
                {l.original_price && (
                  <>
                    <span className="text-sm tabular-nums text-muted-foreground line-through">
                      {formatPrice(l.original_price)}
                    </span>
                    <span className="rounded-md bg-ink px-1.5 py-0.5 text-xs text-ink-foreground">
                      −{discountPercent(l.price, l.original_price)}%
                    </span>
                  </>
                )}
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-2">
                <Fact label="Condition">{PREOWNED_CONDITION_LABELS[l.condition]}</Fact>
                <Fact label="Category">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="size-3.5" aria-hidden="true" />
                    {l.category}
                  </span>
                </Fact>
                <Fact label="Location">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {l.location}
                  </span>
                </Fact>
                <Fact label="Listed">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {formatDay(l.created_at)}
                  </span>
                </Fact>
              </dl>

              <div className="mt-5 flex items-center gap-3 rounded-[16px] border border-border bg-surface p-3">
                <span className="grid size-11 place-items-center rounded-full bg-preowned-soft font-display text-sm font-semibold text-preowned">
                  {l.owner.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.owner.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Student seller
                    {l.owner.member_since &&
                      ` · on CampusCart since ${formatDay(l.owner.member_since)}`}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {l.is_owner ? (
                  <>
                    <Button asChild size="lg">
                      <Link to="/preowned/$listingId/edit" params={{ listingId: l.id }}>
                        <Pencil /> Edit listing
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link to="/account/preowned">Manage my listings</Link>
                    </Button>
                  </>
                ) : (
                  <ContactButton
                    kind="preowned"
                    id={l.id}
                    label={l.status === "sold" ? "Sold" : "Message seller"}
                    tone="preowned"
                    disabled={l.status === "sold"}
                    className="flex-1 sm:flex-none"
                  />
                )}
              </div>

              <section className="mt-6">
                <h2 className="text-sm font-semibold">Description</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {l.description}
                </p>
              </section>

              <div className="mt-6 flex items-start justify-between gap-3 border-t border-border pt-4">
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Meet on campus in a public place and check the item before you pay.
                </p>
                {!l.is_owner && <ReportButton kind="preowned" id={l.id} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
