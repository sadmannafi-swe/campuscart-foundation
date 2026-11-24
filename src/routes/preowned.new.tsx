import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { LoginPrompt, ModuleHeader } from "@/components/modules/ModuleKit";
import { PreOwnedForm } from "@/components/modules/preowned/PreOwnedForm";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/preowned/new")({
  head: () => ({ meta: [{ title: "Sell an item — Pre-Owned — CampusCart" }] }),
  component: NewPreOwned,
});

function NewPreOwned() {
  const { user, loading } = useAuth();
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-6 sm:py-10">
        <ModuleHeader
          tone="preowned"
          icon={ShoppingBag}
          eyebrow="Pre-Owned"
          title="Sell an item"
          description="No store needed. Add clear photos and an honest description."
        />
        {loading ? null : user ? (
          <PreOwnedForm />
        ) : (
          <LoginPrompt text="Log in to sell your used items to other students." />
        )}
      </div>
    </SiteLayout>
  );
}
