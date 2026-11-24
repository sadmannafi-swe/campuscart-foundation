import { createFileRoute } from "@tanstack/react-router";
import { HeartHandshake } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { LoginPrompt, ModuleHeader } from "@/components/modules/ModuleKit";
import { DonorForm } from "@/components/modules/blood/BloodKit";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useMyDonorProfile } from "@/lib/modules";

export const Route = createFileRoute("/blood/donor")({
  head: () => ({ meta: [{ title: "Become a donor — CampusCart" }] }),
  component: DonorPage,
});

function DonorPage() {
  const { user, loading } = useAuth();
  const { data, isLoading } = useMyDonorProfile(!!user);
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-6 sm:py-10">
        <ModuleHeader
          tone="blood"
          icon={HeartHandshake}
          eyebrow="Blood Donation"
          title={data ? "Your donor profile" : "Become a donor"}
          description="Students looking for your blood group can find and message you."
        />
        {loading || (user && isLoading) ? (
          <Skeleton className="h-96 rounded-[20px]" />
        ) : !user ? (
          <LoginPrompt text="Log in to register as a blood donor." />
        ) : (
          <DonorForm key={data?.id ?? "new"} existing={data ?? null} />
        )}
      </div>
    </SiteLayout>
  );
}
