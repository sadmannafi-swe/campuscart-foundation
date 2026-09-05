import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { SellerShell } from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import { adminWhatsAppLink } from "@/config/platform";

export const Route = createFileRoute("/sell/dashboard/help")({
  component: SellerHelp,
});

function SellerHelp() {
  return (
    <SellerShell title="Help & Support">
      <div className="card-surface space-y-3 p-4">
        <h2 className="text-base font-bold">Need a hand?</h2>
        <p className="text-sm text-muted-foreground">
          The CampusCart admin team can help with verification, store settings, product listings and
          order issues.
        </p>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <a
            href={adminWhatsAppLink("Hi CampusCart admin, I need help with my seller account.")}
            target="_blank"
            rel="noreferrer noopener"
          >
            <MessageCircle className="mr-2 size-4" aria-hidden="true" />
            Contact Admin on WhatsApp
          </a>
        </Button>
      </div>
    </SellerShell>
  );
}
