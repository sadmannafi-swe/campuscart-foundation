import { Router } from "express";
import type {
  PublicProduct,
  PublicReview,
  PublicStore,
  PublicStoreSummary,
} from "../../shared/types";
import { universityBySlug } from "../../shared/universities";
import { col, toApi, type StoreDoc } from "../lib/db";
import { notFound } from "../lib/http";

export const publicRouter = Router();

const publicStore = (s: StoreDoc): PublicStore => ({
  id: s._id,
  name: s.name,
  category: s.category,
  description: s.description,
  university_slug: s.university_slug,
  logo_path: s.logo_path,
  contact_number: s.contact_number,
  featured_university_slug: s.featured_university_slug,
  approved_at: s.approved_at?.toISOString() ?? null,
  created_at: s.created_at.toISOString(),
});

/** Active listings of approved stores, newest first, with rating aggregates. */
publicRouter.get("/products", async (_req, res) => {
  const stores = await col
    .stores()
    .find({ status: "approved" }, { projection: { name: 1, seller_id: 1 } })
    .toArray();
  const storeById = new Map(stores.map((s) => [s._id, s]));
  const products = await col
    .products()
    .find({ is_active: true, store_id: { $in: [...storeById.keys()] } })
    .sort({ created_at: -1 })
    .limit(500)
    .toArray();
  const ratings = await col
    .reviews()
    .aggregate<{ _id: string; avg: number; count: number }>([
      { $match: { product_id: { $in: products.map((p) => p._id) } } },
      { $group: { _id: "$product_id", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();
  const ratingBy = new Map(ratings.map((r) => [r._id, r]));
  const out: PublicProduct[] = products.map((p) => ({
    ...toApi(p),
    store_name: storeById.get(p.store_id)?.name ?? "Campus seller",
    seller_id: storeById.get(p.store_id)?.seller_id ?? "",
    rating: Math.round((ratingBy.get(p._id)?.avg ?? 0) * 10) / 10,
    review_count: ratingBy.get(p._id)?.count ?? 0,
  }));
  res.set("cache-control", "public, max-age=15").json(out);
});

/** Approved stores (optionally one university), with active-listing counts and ratings. */
publicRouter.get("/stores", async (req, res) => {
  const university = typeof req.query["university"] === "string" ? req.query["university"] : "";
  const filter: Record<string, unknown> = { status: "approved" };
  if (university) {
    if (!universityBySlug(university)) return res.json([]);
    filter["university_slug"] = university;
  }
  const stores = await col.stores().find(filter).sort({ approved_at: -1 }).limit(500).toArray();
  const ids = stores.map((s) => s._id);
  const counts = await col
    .products()
    .aggregate<{ _id: string; n: number; ids: string[] }>([
      { $match: { store_id: { $in: ids }, is_active: true } },
      { $group: { _id: "$store_id", n: { $sum: 1 }, ids: { $push: "$_id" } } },
    ])
    .toArray();
  const productStore = new Map<string, string>();
  for (const c of counts) for (const pid of c.ids) productStore.set(pid, c._id);
  const ratings = await col
    .reviews()
    .aggregate<{ _id: string; sum: number; count: number }>([
      { $match: { product_id: { $in: [...productStore.keys()] } } },
      { $group: { _id: "$product_id", sum: { $sum: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();
  const byStore = new Map<string, { sum: number; count: number }>();
  for (const r of ratings) {
    const sid = productStore.get(r._id);
    if (!sid) continue;
    const agg = byStore.get(sid) ?? { sum: 0, count: 0 };
    agg.sum += r.sum;
    agg.count += r.count;
    byStore.set(sid, agg);
  }
  const out: PublicStoreSummary[] = stores.map((s) => {
    const r = byStore.get(s._id);
    return {
      ...publicStore(s),
      product_count: counts.find((c) => c._id === s._id)?.n ?? 0,
      rating: r && r.count ? Math.round((r.sum / r.count) * 10) / 10 : 0,
      review_count: r?.count ?? 0,
    };
  });
  return res.set("cache-control", "public, max-age=15").json(out);
});

publicRouter.get("/stores/featured", async (req, res) => {
  const university = String(req.query["university"] ?? "");
  const stores = await col
    .stores()
    .find({ status: "approved", featured_university_slug: university })
    .sort({ updated_at: -1 })
    .limit(24)
    .toArray();
  res.json(stores.map(publicStore));
});

publicRouter.get("/stores/:id", async (req, res) => {
  const store = await col.stores().findOne({ _id: req.params["id"], status: "approved" });
  if (!store) throw notFound("Store unavailable");
  res.json(publicStore(store));
});

/** Public reviews: author name, rating, comment, date only — never buyer ids. */
publicRouter.get("/products/:id/reviews", async (req, res) => {
  const product = await col.products().findOne({ _id: req.params["id"], is_active: true });
  const store = product
    ? await col.stores().findOne({ _id: product.store_id, status: "approved" })
    : null;
  if (!product || !store) return res.json([]);
  const reviews = await col
    .reviews()
    .find({ product_id: product._id })
    .sort({ created_at: -1 })
    .limit(200)
    .toArray();
  const out: PublicReview[] = reviews.map((r) => ({
    id: r._id,
    author: r.author_name || "CampusCart buyer",
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at.toISOString(),
  }));
  return res.json(out);
});
