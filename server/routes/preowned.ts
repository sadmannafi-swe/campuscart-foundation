import { Router, type Request } from "express";
import { z } from "zod";
import { PREOWNED_CATEGORIES, PREOWNED_CONDITIONS, type PreOwnedListing } from "../../shared/types";
import { col, toApi, type PreOwnedDoc } from "../lib/db";
import {
  badRequest,
  marketplaceParam,
  me,
  newId,
  notFound,
  parse,
  requireUser,
  type SessionUser,
} from "../lib/http";
import {
  assertOwner,
  isAdmin,
  money,
  numParam,
  optionalUser,
  ownerFields,
  ownImages,
  publicOwners,
  sortParam,
  strParam,
  textMatch,
  universityField,
} from "../lib/modules";

/**
 * Pre-Owned: students sell their own used items without a seller store.
 * Its own collection and routes; nothing here is reachable from /api/products.
 */
export const preownedRouter = Router();

const listingSchema = z.object({
  university_slug: universityField,
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(PREOWNED_CATEGORIES),
  price: money,
  original_price: money.nullable().optional(),
  condition: z.enum(PREOWNED_CONDITIONS),
  images: z.array(z.string().url()).min(1, "Add at least one photo").max(8),
  location: z.string().trim().min(2).max(80),
});

function checkPrices(price: number, original: number | null | undefined) {
  if (original != null && original <= price)
    throw badRequest("Original price must be higher than the selling price.");
}

export async function preownedToApi(
  docs: PreOwnedDoc[],
  viewer: SessionUser | null,
): Promise<PreOwnedListing[]> {
  const owners = await publicOwners(docs.map((d) => d.owner_id));
  return docs.map((d) => {
    const { sold_at: _s, ...rest } = toApi(d);
    return {
      ...rest,
      original_price: d.original_price ?? null,
      ...ownerFields(d.owner_id, owners, viewer?.id),
    } as PreOwnedListing;
  });
}

/** Public browse filter, shared with the global search. */
export function preownedFilter(req: Request, university: string) {
  const filter: Record<string, unknown> = { university_slug: university, moderation: "visible" };
  const status = req.query["status"];
  if (status === "sold") filter["status"] = "sold";
  else if (status !== "all") filter["status"] = "available";
  const q = strParam(req.query["q"]);
  if (q) filter["$or"] = [{ title: textMatch(q) }, { description: textMatch(q) }];
  const category = strParam(req.query["category"]);
  if (category && (PREOWNED_CATEGORIES as readonly string[]).includes(category))
    filter["category"] = category;
  const condition = strParam(req.query["condition"]);
  if (condition && (PREOWNED_CONDITIONS as readonly string[]).includes(condition))
    filter["condition"] = condition;
  const location = strParam(req.query["location"]);
  if (location) filter["location"] = textMatch(location);
  const min = numParam(req.query["min"]);
  const max = numParam(req.query["max"]);
  if (min !== undefined || max !== undefined)
    filter["price"] = {
      ...(min !== undefined && { $gte: min }),
      ...(max !== undefined && { $lte: max }),
    };
  return filter;
}

const sorts = {
  newest: { created_at: -1 },
  price_asc: { price: 1, created_at: -1 },
  price_desc: { price: -1, created_at: -1 },
} as const;

preownedRouter.get("/preowned", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const sort = sortParam(req.query["sort"], Object.keys(sorts), "newest") as keyof typeof sorts;
  const docs = await col
    .preowned()
    .find(preownedFilter(req, university))
    .sort(sorts[sort])
    .limit(300)
    .toArray();
  res.json(await preownedToApi(docs, await optionalUser(req)));
});

preownedRouter.get("/preowned/mine", requireUser, async (req, res) => {
  const u = me(req);
  const docs = await col.preowned().find({ owner_id: u.id }).sort({ created_at: -1 }).toArray();
  res.json(await preownedToApi(docs, u));
});

preownedRouter.get("/preowned/:id", async (req, res) => {
  const viewer = await optionalUser(req);
  const doc = await col.preowned().findOne({ _id: req.params["id"] });
  const canSeeHidden =
    !!viewer && !!doc && (doc.owner_id === viewer.id || (await isAdmin(viewer.id)));
  if (!doc || (doc.moderation !== "visible" && !canSeeHidden)) throw notFound("Listing not found");
  res.json((await preownedToApi([doc], viewer))[0]);
});

preownedRouter.post("/preowned", requireUser, async (req, res) => {
  const u = me(req);
  const body = parse(listingSchema, req.body);
  checkPrices(body.price, body.original_price);
  const now = new Date();
  const doc: PreOwnedDoc = {
    _id: newId(),
    owner_id: u.id,
    university_slug: body.university_slug,
    title: body.title,
    description: body.description,
    category: body.category,
    price: body.price,
    original_price: body.original_price ?? null,
    condition: body.condition,
    images: ownImages("preowned", u.id, body.images),
    location: body.location,
    status: "available",
    moderation: "visible",
    sold_at: null,
    created_at: now,
    updated_at: now,
  };
  await col.preowned().insertOne(doc);
  res.status(201).json((await preownedToApi([doc], u))[0]);
});

preownedRouter.patch("/preowned/:id", requireUser, async (req, res) => {
  const u = me(req);
  const doc = await col.preowned().findOne({ _id: req.params["id"] });
  assertOwner(doc, u.id, "Listing");
  const body = parse(listingSchema.partial(), req.body);
  checkPrices(
    body.price ?? doc!.price,
    body.original_price === undefined ? doc!.original_price : body.original_price,
  );
  const set: Partial<PreOwnedDoc> = { updated_at: new Date() };
  for (const key of [
    "university_slug",
    "title",
    "description",
    "category",
    "price",
    "condition",
    "location",
  ] as const) {
    if (body[key] !== undefined) (set as Record<string, unknown>)[key] = body[key];
  }
  if (body.original_price !== undefined) set.original_price = body.original_price;
  if (body.images !== undefined) set.images = ownImages("preowned", u.id, body.images);
  await col.preowned().updateOne({ _id: doc!._id, owner_id: u.id }, { $set: set });
  res.json({ ok: true });
});

preownedRouter.patch("/preowned/:id/status", requireUser, async (req, res) => {
  const u = me(req);
  const { status } = parse(z.object({ status: z.enum(["available", "sold"]) }), req.body);
  const doc = await col.preowned().findOne({ _id: req.params["id"] });
  assertOwner(doc, u.id, "Listing");
  await col
    .preowned()
    .updateOne(
      { _id: doc!._id, owner_id: u.id },
      { $set: { status, sold_at: status === "sold" ? new Date() : null, updated_at: new Date() } },
    );
  res.json({ ok: true });
});

preownedRouter.delete("/preowned/:id", requireUser, async (req, res) => {
  const u = me(req);
  const doc = await col.preowned().findOne({ _id: req.params["id"] });
  assertOwner(doc, u.id, "Listing");
  await col.preowned().deleteOne({ _id: doc!._id, owner_id: u.id });
  res.json({ ok: true });
});
