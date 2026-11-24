import { createFileRoute } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EmptyState } from "@/components/common/StateBlocks";
import { LoginPrompt, ModuleHeader } from "@/components/modules/ModuleKit";
import { BashaForm } from "@/components/modules/basha/BashaKit";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useBashaListing } from "@/lib/modules";

export const Route = createFileRoute("/basha/$listingId_/edit")({
  head: () => ({ meta: [{ title: "Edit listing — BashaLagbe — CampusCart" }] }),
  component: EditBasha,
});

function EditBasha() {
  const { listingId } = Route.useParams();
  const { user, loading } = useAuth();
  const { data, isLoading } = useBashaListing(listingId);
  return (
    <SiteLayout>
      <div className="container-page max-w-4xl py-6 sm:py-10">
        <ModuleHeader tone="basha" icon={Home} eyebrow="BashaLagbe" title="Edit listing" />
        {loading || isLoading ? (
          <Skeleton className="h-96 rounded-[20px]" />
        ) : !user ? (
          <LoginPrompt text="Log in to edit your listing." />
        ) : !data?.is_owner ? (
          <EmptyState title="You can only edit your own listings" />
        ) : (
          <BashaForm existing={data} />
        )}
      </div>
    </SiteLayout>
  );
}
