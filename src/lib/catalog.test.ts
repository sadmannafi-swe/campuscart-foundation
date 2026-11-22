import { describe, expect, it } from "vitest";
import * as sample from "@/data/fixtures/sampleCatalog";
import * as marketplace from "@/data/marketplace";
import { filterProducts } from "@/lib/catalog";

describe("catalogue", () => {
  it("shows no sample stores/products unless VITE_SAMPLE_CATALOG is enabled", () => {
    expect(marketplace.SAMPLE_CATALOG_ENABLED).toBe(false);
    expect(marketplace.products).toEqual([]);
    expect(marketplace.stores).toEqual([]);
    expect(marketplace.getProductBySlug(sample.products[0]!.slug)).toBeUndefined();
    expect(marketplace.categories.length).toBeGreaterThan(0);
  });

  it("filters and sorts products (using the sample fixture)", () => {
    const electronics = filterProducts(sample.products, { category: "electronics" });
    expect(electronics.length).toBeGreaterThan(0);
    expect(electronics.every((p) => p.categorySlug === "electronics")).toBe(true);
    const cheap = filterProducts(sample.products, { max: 500, sort: "price-asc" });
    expect(cheap.every((p) => p.price <= 500)).toBe(true);
    expect(cheap.map((p) => p.price)).toEqual([...cheap.map((p) => p.price)].sort((a, b) => a - b));
  });

  it("matches live listings by their own store name", () => {
    const live = {
      ...sample.products[0]!,
      id: "x",
      storeId: "live-store",
      storeName: "Rafi Gadgets",
      live: true,
    };
    expect(filterProducts([live], { q: "rafi" })).toHaveLength(1);
  });
});
