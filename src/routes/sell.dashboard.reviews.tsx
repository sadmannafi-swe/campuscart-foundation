import { createFileRoute } from "@tanstack/react-router";
import { SellerShell, SellerPlaceholder } from "@/components/seller/SellerShell";

export const Route = createFileRoute("/sell/dashboard/reviews")({
  component: SellerReviews,
});

function SellerReviews() {
  return (
    <SellerShell title="Reviews">
      <SellerPlaceholder
        title="No reviews yet"
        description="Buyer reviews of your products will appear here. Student IDs are never shown with a review."
      />
    </SellerShell>
  );
}
