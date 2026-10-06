import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { shortOrderId } from "@/lib/orders";

export const Route = createFileRoute("/order-confirmation")({
  validateSearch: (s: Record<string, unknown>): { ids?: string | undefined } => ({
    ids: typeof s["ids"] === "string" ? s["ids"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Order Confirmed — CampusCart" },
      { name: "description", content: "Your CampusCart order has been placed." },
      { property: "og:title", content: "Order Confirmed — CampusCart" },
      { property: "og:description", content: "Your CampusCart order has been placed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderConfirmation,
});

function OrderConfirmation() {
  const { ids } = Route.useSearch();
  const list = (ids ?? "").split(",").filter(Boolean);
  return (
    <SiteLayout>
      <div className="container-page grid place-items-center py-12">
        <div className="card-surface w-full max-w-md p-6 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent-soft text-accent">
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-extrabold">Order placed!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The seller has received your order and will confirm it soon.
          </p>
          {list.length > 0 && (
            <p className="mt-3 text-sm font-semibold">
              {list.length > 1 ? "Orders" : "Order"} {list.map(shortOrderId).join(", ")}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <Button asChild>
              <Link to="/orders">View my orders</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/diu">Continue shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
