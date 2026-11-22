/**
 * Catalogue entry point for the UI.
 *
 * Production shows only real listings from the API (src/lib/liveCatalog.ts).
 * The sample stores/products in ./fixtures are a development/test fixture: they
 * appear only in `npm run dev` with VITE_SAMPLE_CATALOG=true, and are compiled
 * out of production builds (import.meta.env.DEV is false there).
 */
import type { Product, Review, Store } from "@/lib/types";
import * as sample from "@/data/fixtures/sampleCatalog";

export { categories } from "@/data/categories";

export const SAMPLE_CATALOG_ENABLED =
  import.meta.env.DEV && import.meta.env["VITE_SAMPLE_CATALOG"] === "true";

const none = <T>(): T[] => [];

export const stores: Store[] = SAMPLE_CATALOG_ENABLED ? sample.stores : none<Store>();
export const products: Product[] = SAMPLE_CATALOG_ENABLED ? sample.products : none<Product>();

export const getStoreById = (id: string) => stores.find((s) => s.id === id);
export const getStoreBySlug = (slug: string) => stores.find((s) => s.slug === slug);
export const getProductBySlug = (slug: string) => products.find((p) => p.slug === slug);
export const getProductsByStore = (storeId: string) =>
  products.filter((p) => p.storeId === storeId);
export const getProductsByTag = (tag: Product["tags"][number]) =>
  products.filter((p) => p.tags.includes(tag));
export const getFeaturedStores = () => stores.filter((s) => s.featured);
export const getTopRatedStores = () => [...stores].sort((a, b) => b.rating - a.rating).slice(0, 4);
export const getRelatedProducts = (product: Product): Product[] =>
  SAMPLE_CATALOG_ENABLED ? sample.getRelatedProducts(product) : [];
export const getReviewsForProduct = (product: Product): Review[] =>
  SAMPLE_CATALOG_ENABLED ? sample.getReviewsForProduct(product) : [];
