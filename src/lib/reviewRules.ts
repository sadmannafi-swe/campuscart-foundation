export function canWriteReview({ status, buyerId, userId, productId, reviewed }: {
  status: string;
  buyerId: string;
  userId: string | undefined;
  productId: string | null;
  reviewed: boolean;
}) {
  return status === "delivered" && Boolean(userId) && buyerId === userId && Boolean(productId) && !reviewed;
}

export function validReviewRating(rating: number) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export function averageReviewRating(reviews: { rating: number }[]) {
  return reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
}