import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { AccountPlaceholder } from "@/components/layout/AccountPlaceholder";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — DIU CampusCart" },
      { name: "description", content: "Track your campus pickups and deliveries." },
      { property: "og:title", content: "Orders — DIU CampusCart" },
      { property: "og:description", content: "Track your campus pickups and deliveries." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AccountPlaceholder
      title="Orders"
      description="Order history arrives with accounts"
      icon={<Package className="size-6" aria-hidden="true" />}
    />
  ),
});
