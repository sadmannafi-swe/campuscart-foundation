import { createFileRoute } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { LoginPrompt, ModuleHeader } from "@/components/modules/ModuleKit";
import { BashaForm } from "@/components/modules/basha/BashaKit";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/basha/new")({
  head: () => ({ meta: [{ title: "List a place — BashaLagbe — CampusCart" }] }),
  component: NewBasha,
});

function NewBasha() {
  const { user, loading } = useAuth();
  return (
    <SiteLayout>
      <div className="container-page max-w-4xl py-6 sm:py-10">
        <ModuleHeader
          tone="basha"
          icon={Home}
          eyebrow="BashaLagbe"
          title="List a place"
          description="A room, a seat for a roommate, or a full apartment."
        />
        {loading ? null : user ? (
          <BashaForm />
        ) : (
          <LoginPrompt text="Log in to list a room or apartment." />
        )}
      </div>
    </SiteLayout>
  );
}
