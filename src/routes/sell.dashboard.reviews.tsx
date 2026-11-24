import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { SellerShell, SellerPlaceholder } from "@/components/seller/SellerShell";
import { Rating } from "@/components/common/Rating";
import { useAuth } from "@/lib/auth";
import { useSellerReviews } from "@/lib/reviews";

export const Route = createFileRoute("/sell/dashboard/reviews")({
  component: SellerReviews,
});

function SellerReviews() {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useSellerReviews(user?.id);
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  return (
    <SellerShell title="Reviews">
      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <SellerPlaceholder
          title="No reviews yet"
          description="Buyer reviews of your products will appear here. Student IDs are never shown with a review."
        />
      ) : (
        <>
          <div className="card-surface flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Average rating</p>
              <p className="text-2xl font-semibold">{average.toFixed(1)}</p>
            </div>
            <Rating value={Math.round(average * 10) / 10} reviewCount={reviews.length} size="md" />
          </div>
          <ul className="mt-3 space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="card-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{r.product_name}</p>
                  <Rating value={r.rating} showValue={false} />
                </div>
                {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  {r.author} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </SellerShell>
  );
}
