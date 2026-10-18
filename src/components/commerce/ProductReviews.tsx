import { BadgeCheck, Loader2 } from "lucide-react";
import { Rating } from "@/components/common/Rating";
import { useProductReviews } from "@/lib/reviews";
import { averageReviewRating } from "@/lib/reviewRules";

export function ProductReviews({ productId }: { productId: string }) {
  const { data: reviews = [], isLoading, isError } = useProductReviews(productId);
  const average = averageReviewRating(reviews);

  return (
    <section className="mt-8 border-t border-border pt-5" aria-label="Product reviews">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Reviews</h2>
        {reviews.length > 0 && <Rating value={average} reviewCount={reviews.length} size="md" />}
      </div>
      {isLoading ? <Loader2 className="mt-4 size-5 animate-spin text-primary" aria-label="Loading reviews" />
        : isError ? <p role="alert" className="mt-3 text-sm text-destructive">Unable to load reviews.</p>
        : reviews.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
        : <ul className="mt-4 space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="border-b border-border pb-4 last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-semibold">{review.author}</span>
                <Rating value={review.rating} />
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent"><BadgeCheck className="size-3" />Verified Purchase</span>
                <span className="ml-auto text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString("en-GB")}</span>
              </div>
              {review.comment && <p className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">{review.comment}</p>}
            </li>
          ))}
        </ul>}
    </section>
  );
}