import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { AccountPlaceholder } from "@/components/layout/AccountPlaceholder";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — DIU CampusCart" },
      { name: "description", content: "Keep track of the campus listings you love." },
      { property: "og:title", content: "Wishlist — DIU CampusCart" },
      { property: "og:description", content: "Keep track of the campus listings you love." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AccountPlaceholder
      title="Wishlist"
      description="Saved items appear here"
      icon={<Heart className="size-6" aria-hidden="true" />}
    />
  ),
});
