import { createFileRoute } from "@tanstack/react-router";
import { Droplet } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EmptyState } from "@/components/common/StateBlocks";
import { LoginPrompt, ModuleHeader } from "@/components/modules/ModuleKit";
import { BloodRequestForm } from "@/components/modules/blood/BloodKit";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useBloodRequest } from "@/lib/modules";

export const Route = createFileRoute("/blood/requests/$requestId_/edit")({
  head: () => ({ meta: [{ title: "Edit blood request — CampusCart" }] }),
  component: EditRequest,
});

function EditRequest() {
  const { requestId } = Route.useParams();
  const { user, loading } = useAuth();
  const { data, isLoading } = useBloodRequest(requestId);
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-6 sm:py-10">
        <ModuleHeader
          tone="blood"
          icon={Droplet}
          eyebrow="Blood Donation"
          title="Edit blood request"
        />
        {loading || isLoading ? (
          <Skeleton className="h-96 rounded-[20px]" />
        ) : !user ? (
          <LoginPrompt text="Log in to edit your request." />
        ) : !data?.is_owner ? (
          <EmptyState title="You can only edit your own requests" />
        ) : (
          <BloodRequestForm existing={data} />
        )}
      </div>
    </SiteLayout>
  );
}
