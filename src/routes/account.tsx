import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { AccountPlaceholder } from "@/components/layout/AccountPlaceholder";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — DIU CampusCart" },
      { name: "description", content: "Manage your CampusCart buyer or seller profile." },
      { property: "og:title", content: "Account — DIU CampusCart" },
      { property: "og:description", content: "Manage your CampusCart buyer or seller profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AccountPlaceholder
      title="Account"
      description="Buyer and seller profiles are coming"
      icon={<User className="size-6" aria-hidden="true" />}
    />
  ),
});
