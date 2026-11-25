import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { EmptyState } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvent } from "@/lib/events";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event — DIU CampusCart" },
      { name: "description", content: "Products picked for a DIU CampusCart event." },
    ],
  }),
  component: EventPage,
});

/** An admin event: its banner and the products the admin selected (live listings only). */
function EventPage() {
  const { eventId } = Route.useParams();
  const { data: event, isLoading } = useEvent(eventId, "diu");

  return (
    <SiteLayout>
      <div className="container-page space-y-4 pb-10 pt-3 sm:pt-4">
        <BackButton />
        {isLoading ? (
          <>
            <Skeleton className="aspect-[16/5] w-full rounded-[18px] lg:aspect-[4/1]" />
            <Skeleton className="h-7 w-48" />
          </>
        ) : !event ? (
          <EmptyState
            title="This event has ended"
            description="Browse everything DIU students are selling right now."
            action={
              <Button asChild size="sm">
                <Link to="/diu">Back to the marketplace</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="aspect-[16/5] overflow-hidden rounded-[18px] bg-muted sm:rounded-[22px] lg:aspect-[4/1]">
              <img src={event.banner_url} alt="" className="size-full object-cover" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                {event.title}
              </h1>
              {event.description && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{event.description}</p>
              )}
            </div>
            {event.products.length > 0 ? (
              <ProductGrid products={event.products} />
            ) : (
              <p className="text-sm text-muted-foreground">
                The products for this event are no longer available.
              </p>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}
