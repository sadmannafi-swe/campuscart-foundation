import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EmptyState } from "@/components/common/StateBlocks";
import { LoginPrompt, ModuleHeader } from "@/components/modules/ModuleKit";
import { PreOwnedForm } from "@/components/modules/preowned/PreOwnedForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { usePreOwnedListing } from "@/lib/modules";

export const Route = createFileRoute("/preowned/$listingId_/edit")({
  head: () => ({ meta: [{ title: "Edit listing — Pre-Owned — CampusCart" }] }),
  component: EditPreOwned,
});

function EditPreOwned() {
  const { listingId } = Route.useParams();
  const { user, loading } = useAuth();
  const { data, isLoading } = usePreOwnedListing(listingId);
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-6 sm:py-10">
        <ModuleHeader tone="preowned" icon={ShoppingBag} eyebrow="Pre-Owned" title="Edit listing" />
        {loading || isLoading ? (
          <Skeleton className="h-96 rounded-[20px]" />
        ) : !user ? (
          <LoginPrompt text="Log in to edit your listing." />
        ) : !data?.is_owner ? (
          <EmptyState title="You can only edit your own listings" />
        ) : (
          <PreOwnedForm existing={data} />
        )}
      </div>
    </SiteLayout>
  );
}
