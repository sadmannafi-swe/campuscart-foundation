import { Router } from "express";
import type {
  PublicEvent,
  PublicProduct,
  PublicReview,
  PublicStore,
  PublicStoreSummary,
} from "../../shared/types";
import { col, toApi, type EventDoc, type StoreDoc } from "../lib/db";
import { marketplaceParam, notFound, PUBLIC_CDN_CACHE } from "../lib/http";
import { activePromotions } from "../lib/billing";

export const publicRouter = Router();

/**
 * Featured = picked by an admin OR in a paid promotion that is running right now
 * (starts_at <= now < expires_at). Promotions are never written onto the products or
 * stores, so they stop the moment they expire and the admin's own picks are untouched.
 */
const featuredSlug = (manual: string | null, promoted: boolean, university: string) =>
  promoted ? university : manual;

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

/**
 * Active listings of approved stores in ONE university marketplace, newest first, with
 * rating aggregates. Only the `products` collection: Pre-Owned listings live elsewhere
 * and can never appear here. `match` narrows the products (used by search).
 */
export async function marketplaceProducts(
  university: string,
  match: Record<string, unknown> = {},
): Promise<PublicProduct[]> {
  const stores = await col
    .stores()
    .find(
      { status: "approved", university_slug: university },
      { projection: { name: 1, seller_id: 1 } },
    )
    .toArray();
  const storeById = new Map(stores.map((s) => [s._id, s]));
  const products = await col
    .products()
    .find({
      ...match,
      is_active: true,
      university_slug: university,
      store_id: { $in: [...storeById.keys()] },
    })
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
  const promo = await activePromotions(university);
  return products.map((p) => ({
    ...toApi(p),
    featured_university_slug: featuredSlug(
      p.featured_university_slug,
      promo.productKeys.has(`${p.store_id}:${p._id}`),
      university,
    ),
    store_name: storeById.get(p.store_id)?.name ?? "Campus seller",
    seller_id: storeById.get(p.store_id)?.seller_id ?? "",
    rating: Math.round((ratingBy.get(p._id)?.avg ?? 0) * 10) / 10,
    review_count: ratingBy.get(p._id)?.count ?? 0,
  }));
}

publicRouter.get("/products", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const out = await marketplaceProducts(university);
  res.set("cache-control", PUBLIC_CDN_CACHE).json(out);
});

/** Approved stores (optionally one university), with active-listing counts and ratings. */
publicRouter.get("/stores", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const filter: Record<string, unknown> = { status: "approved", university_slug: university };
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
  const promo = await activePromotions(university);
  const out: PublicStoreSummary[] = stores.map((s) => {
    const r = byStore.get(s._id);
    return {
      ...publicStore(s),
      featured_university_slug: featuredSlug(
        s.featured_university_slug,
        promo.storeIds.has(s._id),
        university,
      ),
      product_count: counts.find((c) => c._id === s._id)?.n ?? 0,
      rating: r && r.count ? Math.round((r.sum / r.count) * 10) / 10 : 0,
      review_count: r?.count ?? 0,
    };
  });
  return res.set("cache-control", PUBLIC_CDN_CACHE).json(out);
});

publicRouter.get("/stores/featured", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const promo = await activePromotions(university);
  const stores = await col
    .stores()
    .find({
      status: "approved",
      university_slug: university,
      $or: [{ featured_university_slug: university }, { _id: { $in: [...promo.storeIds] } }],
    })
    .sort({ updated_at: -1 })
    .limit(24)
    .toArray();
  // Paid promotions first (they paid for the spot), then the admin's picks.
  stores.sort((a, b) => Number(promo.storeIds.has(b._id)) - Number(promo.storeIds.has(a._id)));
  res.set("cache-control", PUBLIC_CDN_CACHE).json(
    stores.map((s) => ({
      ...publicStore(s),
      featured_university_slug: featuredSlug(
        s.featured_university_slug,
        promo.storeIds.has(s._id),
        university,
      ),
    })),
  );
});

publicRouter.get("/stores/:id", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const store = await col
    .stores()
    .findOne({ _id: req.params["id"], status: "approved", university_slug: university });
  if (!store) throw notFound("Store unavailable");
  res.set("cache-control", PUBLIC_CDN_CACHE).json(publicStore(store));
});

/** Public reviews: author name, rating, comment, date only — never buyer ids. */
publicRouter.get("/products/:id/reviews", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const product = await col
    .products()
    .findOne({ _id: req.params["id"], is_active: true, university_slug: university });
  const store = product
    ? await col.stores().findOne({ _id: product.store_id, status: "approved" })
    : null;
  res.set("cache-control", PUBLIC_CDN_CACHE);
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

// ---- Homepage event -----------------------------------------------------------------

/** The event with only its products that are still live, in the admin's order. */
async function publicEvent(e: EventDoc): Promise<PublicEvent> {
  const found = e.product_ids.length
    ? await marketplaceProducts(e.university_slug, { _id: { $in: e.product_ids } })
    : [];
  const byId = new Map(found.map((p) => [p.id, p]));
  return {
    id: e._id,
    university_slug: e.university_slug,
    title: e.title,
    description: e.description,
    banner_url: e.banner_url,
    products: e.product_ids.map((id) => byId.get(id)).filter((p): p is PublicProduct => !!p),
  };
}

/** The marketplace's active event (or null): the homepage banner and its product row. */
publicRouter.get("/events/active", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const e = await col
    .events()
    .findOne({ university_slug: university, is_active: true }, { sort: { updated_at: -1 } });
  res.set("cache-control", PUBLIC_CDN_CACHE).json(e ? await publicEvent(e) : null);
});

/** An event page. Only an active event is public. */
publicRouter.get("/events/:id", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const e = await col
    .events()
    .findOne({ _id: req.params["id"], university_slug: university, is_active: true });
  if (!e) throw notFound("This event has ended");
  res.set("cache-control", PUBLIC_CDN_CACHE).json(await publicEvent(e));
});
