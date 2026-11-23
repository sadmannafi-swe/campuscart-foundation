import { createFileRoute } from "@tanstack/react-router";
import { Droplet } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { LoginPrompt, ModuleHeader } from "@/components/modules/ModuleKit";
import { BloodRequestForm } from "@/components/modules/blood/BloodKit";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/blood/requests/new")({
  head: () => ({ meta: [{ title: "Request blood — CampusCart" }] }),
  component: NewRequest,
});

function NewRequest() {
  const { user, loading } = useAuth();
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-6 sm:py-10">
        <ModuleHeader
          tone="blood"
          icon={Droplet}
          eyebrow="Blood Donation"
          title="Request blood"
          description="Share what's needed so donors on campus can reach you."
        />
        {loading ? null : user ? (
          <BloodRequestForm />
        ) : (
          <LoginPrompt text="Log in to post a blood request." />
        )}
      </div>
    </SiteLayout>
  );
}
