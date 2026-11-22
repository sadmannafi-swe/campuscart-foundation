import { describe, expect, it } from "vitest";
import type { PublicProduct } from "@shared/types";
import { liveProductFromApi } from "@/lib/liveCatalog";
import { discountPercent } from "@/lib/format";
import { DEFAULT_MARKETPLACE, liveMarketplaces, marketplaceName } from "@/lib/marketplace";

const row = (over: Partial<PublicProduct> = {}): PublicProduct => ({
  id: "11111111-2222-4333-8444-555555555555",
  store_id: "s1",
  user_id: "u1",
  university_slug: "diu",
  name: "Desk Lamp",
  category: "hostel",
  price: 500,
  original_price: null,
  condition: "new",
  description: "",
  images: [],
  in_stock: true,
  is_active: true,
  featured_university_slug: null,
  created_at: "2020-01-01T00:00:00.000Z",
  updated_at: "2020-01-01T00:00:00.000Z",
  store_name: "Store",
  seller_id: "sel",
  rating: 0,
  review_count: 0,
  ...over,
});

describe("live listings → product cards", () => {
  it("shows a discount only for a valid original price", () => {
    const offer = liveProductFromApi(row({ original_price: 800 }));
    expect(offer.originalPrice).toBe(800);
    expect(offer.tags).toContain("offer");
    expect(discountPercent(offer.price, offer.originalPrice)).toBe(38);

    for (const original of [null, undefined, 500, 400]) {
      const p = liveProductFromApi(
        original === undefined ? row() : row({ original_price: original }),
      );
      expect(p.originalPrice).toBeUndefined();
      expect(p.tags).not.toContain("offer");
      expect(discountPercent(p.price, p.originalPrice)).toBeNull();
    }
  });

  it("keeps the listing's university", () => {
    expect(liveProductFromApi(row({ university_slug: "nsu" })).universitySlug).toBe("nsu");
  });
});

describe("marketplace selection", () => {
  it("defaults to DIU and only allows live campuses", () => {
    expect(DEFAULT_MARKETPLACE).toBe("diu");
    expect(liveMarketplaces()).toEqual(["diu"]);
    expect(marketplaceName("diu")).toBe("DIU");
  });
});
