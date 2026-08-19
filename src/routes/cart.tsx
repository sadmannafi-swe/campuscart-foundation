import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { AccountPlaceholder } from "@/components/layout/AccountPlaceholder";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — DIU CampusCart" },
      { name: "description", content: "Review the campus listings you're ready to order." },
      { property: "og:title", content: "Your Cart — DIU CampusCart" },
      { property: "og:description", content: "Review the campus listings you're ready to order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AccountPlaceholder
      title="Your cart"
      description="Your cart is waiting for accounts"
      icon={<ShoppingCart className="size-6" aria-hidden="true" />}
    />
  ),
});
