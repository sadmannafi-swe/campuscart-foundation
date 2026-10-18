import { describe, expect, it } from "vitest";
import { averageReviewRating, canWriteReview, validReviewRating } from "./reviewRules";

const purchase = { status: "delivered", buyerId: "buyer-a", userId: "buyer-a", productId: "product-a", reviewed: false };

describe("purchase review rules", () => {
  it("allows the purchasing buyer after delivery", () => {
    expect(canWriteReview(purchase)).toBe(true);
  });
  it.each(["pending", "confirmed", "processing", "shipped", "cancelled"])("rejects %s orders", (status) => {
    expect(canWriteReview({ ...purchase, status })).toBe(false);
  });
  it("rejects a different buyer or a signed-out visitor", () => {
    expect(canWriteReview({ ...purchase, userId: "buyer-b" })).toBe(false);
    expect(canWriteReview({ ...purchase, userId: undefined })).toBe(false);
  });
  it("prevents a second review of the product for the same order", () => {
    expect(canWriteReview({ ...purchase, reviewed: true })).toBe(false);
    expect(canWriteReview({ ...purchase, reviewed: false })).toBe(true);
  });
  it("requires an existing purchased product", () => {
    expect(canWriteReview({ ...purchase, productId: null })).toBe(false);
  });
  it("accepts only whole star ratings from 1 through 5", () => {
    for (const rating of [1, 2, 3, 4, 5]) expect(validReviewRating(rating)).toBe(true);
    for (const rating of [0, 6, -1, 2.5, NaN]) expect(validReviewRating(rating)).toBe(false);
  });
  it("computes average ratings from submitted reviews", () => {
    expect(averageReviewRating([{ rating: 5 }, { rating: 3 }, { rating: 4 }])).toBe(4);
    expect(averageReviewRating([])).toBe(0);
  });
});