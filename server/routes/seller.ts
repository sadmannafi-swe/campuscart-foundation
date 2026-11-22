import { Router } from "express";
import { z } from "zod";
import {
  canMoveOrder,
  ORDER_STATUSES,
  type SellerEarnings,
  type SellerReview,
} from "../../shared/types";
import { PRODUCT_CONDITIONS, STORE_CATEGORIES, universityBySlug } from "../../shared/universities";
import { isValidEmail } from "../../shared/email/mime";
import { assertOwnImageUrl, assertOwnPrivateId } from "../lib/cloudinary";
import { col, toApi, type ProductDoc, type SellerDoc, type StoreDoc } from "../lib/db";
import { badRequest, HttpError, me, newId, notFound, parse, requireUser } from "../lib/http";
import { notifyStatusChange } from "../lib/notify";
import { orderToApi } from "./orders";

export const sellerRouter = Router();
sellerRouter.use(requireUser);

const sellerOf = (userId: string) => col.sellers().findOne({ user_id: userId });
const storeOf = (userId: string) => col.stores().findOne({ user_id: userId });

async function requireStore(userId: string): Promise<StoreDoc> {
  const store = await storeOf(userId);
  if (!store) throw notFound("Create your store first");
  return store;
}

sellerRouter.get("/account", async (req, res) => {
  const u = me(req);
  const [seller, store] = await Promise.all([sellerOf(u.id), storeOf(u.id)]);
  res.json({ seller: seller ? toApi(seller) : null, store: store ? toApi(store) : null });
});

const sellerSchema = z.object({
  university_slug: z.string().refine((s) => !!universityBySlug(s), "Select your university"),
  full_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(20),
  department: z.string().trim().min(1).max(60),
  batch: z.string().trim().min(1).max(20),
  student_id: z.string().trim().min(3).max(40),
  avatar_id: z.string().max(300).nullable().optional(),
  student_id_image: z.string().nullable().optional(),
});

sellerRouter.post("/account", async (req, res) => {
  const u = me(req);
  const body = parse(sellerSchema, req.body);
  const now = new Date();
  const seller: SellerDoc = {
    _id: newId(),
    user_id: u.id,
    university_slug: body.university_slug,
    full_name: body.full_name,
    email: u.email, // the verified account address, never free text
    phone: body.phone,
    department: body.department,
    batch: body.batch,
    avatar_path: body.avatar_id ? assertOwnPrivateId(body.avatar_id, u.id, "avatar") : null,
    status: "pending",
    order_email_enabled: true,
    notification_email: null,
    created_at: now,
    updated_at: now,
  };
  const idImage = body.student_id_image ? assertOwnPrivateId(body.student_id_image, u.id) : null;
  try {
    await col.sellers().insertOne(seller);
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      throw new HttpError(409, "You already have a seller account");
    throw err;
  }
  await col.sellerIdentities().insertOne({
    _id: seller._id,
    user_id: u.id,
    student_id: body.student_id,
    student_id_image: idImage,
    created_at: now,
  });
  res.status(201).json(toApi(seller));
});

const storeSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(200),
  category: z.enum(STORE_CATEGORIES),
  contact_number: z.string().trim().min(6).max(20),
  logo_url: z.string().url().nullable().optional(),
});

sellerRouter.post("/store", async (req, res) => {
  const u = me(req);
  const seller = await sellerOf(u.id);
  if (!seller) throw badRequest("Create your seller account first");
  const body = parse(storeSchema, req.body);
  const now = new Date();
  const store: StoreDoc = {
    _id: newId(),
    seller_id: seller._id,
    user_id: u.id,
    university_slug: seller.university_slug,
    name: body.name,
    description: body.description,
    category: body.category,
    contact_number: body.contact_number,
    logo_path: body.logo_url ? assertOwnImageUrl(body.logo_url, "store-logo", u.id) : null,
    status: "pending",
    rejection_reason: null,
    approved_at: null,
    featured_university_slug: null,
    created_at: now,
    updated_at: now,
  };
  try {
    await col.stores().insertOne(store);
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      throw new HttpError(409, "You already have a store");
    throw err;
  }
  res.status(201).json(toApi(store));
});

/** Sellers may edit description, contact and logo; name/category/university are admin-managed. */
sellerRouter.patch("/store", async (req, res) => {
  const u = me(req);
  const store = await requireStore(u.id);
  const body = parse(
    z.object({
      description: z.string().trim().min(1).max(200).optional(),
      contact_number: z.string().trim().min(6).max(20).optional(),
      logo_url: z.string().url().nullable().optional(),
    }),
    req.body,
  );
  const set: Partial<StoreDoc> = { updated_at: new Date() };
  if (body.description !== undefined) set.description = body.description;
  if (body.contact_number !== undefined) set.contact_number = body.contact_number;
  if (body.logo_url !== undefined)
    set.logo_path = body.logo_url ? assertOwnImageUrl(body.logo_url, "store-logo", u.id) : null;
  await col.stores().updateOne({ _id: store._id }, { $set: set });
  res.json({ ok: true });
});

sellerRouter.patch("/settings", async (req, res) => {
  const u = me(req);
  const body = parse(
    z.object({
      order_email_enabled: z.boolean(),
      notification_email: z
        .string()
        .trim()
        .max(254)
        .nullable()
        .refine((v) => !v || isValidEmail(v), "Enter a valid e-mail address"),
    }),
    req.body,
  );
  const r = await col.sellers().updateOne(
    { user_id: u.id },
    {
      $set: {
        order_email_enabled: body.order_email_enabled,
        notification_email: body.notification_email || null,
        updated_at: new Date(),
      },
    },
  );
  if (r.matchedCount === 0) throw notFound("Seller account not found");
  res.json({ ok: true });
});

sellerRouter.get("/identity", async (req, res) => {
  const identity = await col.sellerIdentities().findOne({ user_id: me(req).id });
  res.json({ student_id: identity?.student_id ?? null });
});

// ---- Products ---------------------------------------------------------------

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(1).max(60),
  price: z.number().min(0).max(10_000_000),
  original_price: z.number().min(0).max(10_000_000).nullable().optional(),
  condition: z.enum(PRODUCT_CONDITIONS),
  description: z.string().trim().max(2000).default(""),
  images: z.array(z.string().url()).max(6).default([]),
  in_stock: z.boolean().default(true),
  is_active: z.boolean().optional(),
});

const roundMoney = (n: number) => Math.round(n * 100) / 100;

/** An original price is optional, but when present it must exceed the selling price. */
export function checkOriginalPrice(
  price: number,
  original: number | null | undefined,
): number | null {
  if (original === null || original === undefined) return null;
  if (!(original > price))
    throw badRequest("Original price must be greater than the selling price");
  return roundMoney(original);
}

sellerRouter.get("/products", async (req, res) => {
  const store = await storeOf(me(req).id);
  if (!store) return res.json([]);
  const list = await col
    .products()
    .find({ store_id: store._id })
    .sort({ created_at: -1 })
    .toArray();
  return res.json(list.map((p) => toApi(p)));
});

sellerRouter.post("/products", async (req, res) => {
  const u = me(req);
  const store = await requireStore(u.id);
  const body = parse(productSchema, req.body);
  const now = new Date();
  const product: ProductDoc = {
    _id: newId(),
    store_id: store._id,
    user_id: u.id,
    university_slug: store.university_slug,
    name: body.name,
    category: body.category,
    price: roundMoney(body.price),
    original_price: checkOriginalPrice(roundMoney(body.price), body.original_price),
    condition: body.condition,
    description: body.description,
    images: body.images.map((url) => assertOwnImageUrl(url, "product", u.id)),
    in_stock: body.in_stock,
    is_active: body.is_active ?? true,
    featured_university_slug: null,
    created_at: now,
    updated_at: now,
  };
  await col.products().insertOne(product);
  res.status(201).json(toApi(product));
});

sellerRouter.patch("/products/:id", async (req, res) => {
  const u = me(req);
  const body = parse(productSchema.partial(), req.body);
  const set: Partial<ProductDoc> = { updated_at: new Date() };
  for (const key of [
    "name",
    "category",
    "condition",
    "description",
    "in_stock",
    "is_active",
  ] as const) {
    if (body[key] !== undefined) (set as Record<string, unknown>)[key] = body[key];
  }
  if (body.price !== undefined) set.price = roundMoney(body.price);
  if (body.price !== undefined || body.original_price !== undefined) {
    const current = await col.products().findOne({ _id: req.params["id"], user_id: u.id });
    if (!current) throw notFound("Product not found");
    const price = set.price ?? current.price;
    const original =
      body.original_price !== undefined ? body.original_price : current.original_price;
    // Lowering a "was" price below the new selling price would fake a discount: reject.
    set.original_price = checkOriginalPrice(price, original);
  }
  if (body.images !== undefined)
    set.images = body.images.map((url) => assertOwnImageUrl(url, "product", u.id));
  const r = await col.products().updateOne({ _id: req.params["id"], user_id: u.id }, { $set: set });
  if (r.matchedCount === 0) throw notFound("Product not found");
  res.json({ ok: true });
});

sellerRouter.delete("/products/:id", async (req, res) => {
  const r = await col.products().deleteOne({ _id: req.params["id"], user_id: me(req).id });
  if (r.deletedCount === 0) throw notFound("Product not found");
  res.json({ ok: true });
});

// ---- Orders & reviews -------------------------------------------------------

sellerRouter.get("/orders", async (req, res) => {
  const orders = await col
    .orders()
    .find({ seller_user_id: me(req).id })
    .sort({ created_at: -1 })
    .limit(500)
    .toArray();
  res.json(orders.map(orderToApi));
});

sellerRouter.post("/orders/:id/status", async (req, res) => {
  const u = me(req);
  const { status } = parse(
    z.object({ status: z.enum(ORDER_STATUSES as [string, ...string[]]) }),
    req.body,
  );
  const order = await col.orders().findOne({ _id: req.params["id"], seller_user_id: u.id });
  if (!order) throw notFound("Order not found");
  const next = status as typeof order.status;
  if (order.status === next) return res.json(orderToApi(order));
  if (!canMoveOrder(order.status, next)) {
    throw new HttpError(
      409,
      order.status === "delivered" || order.status === "cancelled"
        ? `This order is already ${order.status} and cannot be changed`
        : "Order status can only move forward",
    );
  }
  // Compare-and-set so two tabs can't race each other.
  const updated = await col.orders().findOneAndUpdate(
    { _id: order._id, status: order.status },
    {
      $set: {
        status: next,
        updated_at: new Date(),
        ...(next === "delivered" ? { delivered_at: new Date() } : {}),
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new HttpError(409, "The order changed meanwhile — refresh and try again");
  await notifyStatusChange(updated, next);
  return res.json(orderToApi(updated));
});

/** Start of the current calendar month in Bangladesh time (UTC+6, no DST). */
export function dhakaMonthStart(now = new Date()): Date {
  const dhaka = new Date(now.getTime() + 6 * 3600_000);
  return new Date(Date.UTC(dhaka.getUTCFullYear(), dhaka.getUTCMonth(), 1) - 6 * 3600_000);
}

/** Earnings come only from this seller's delivered orders — never pending or cancelled. */
sellerRouter.get("/earnings", async (req, res) => {
  const u = me(req);
  const orders = await col
    .orders()
    .find({ seller_user_id: u.id, status: { $ne: "cancelled" } })
    .sort({ created_at: -1 })
    .toArray();
  const delivered = orders.filter((o) => o.status === "delivered");
  const deliveredAt = (o: (typeof orders)[number]) => o.delivered_at ?? o.updated_at;
  const monthStart = dhakaMonthStart();
  const money = (n: number) => Math.round(n * 100) / 100;
  const out: SellerEarnings = {
    total_earnings: money(delivered.reduce((n, o) => n + o.subtotal, 0)),
    this_month: money(
      delivered.filter((o) => deliveredAt(o) >= monthStart).reduce((n, o) => n + o.subtotal, 0),
    ),
    delivered_orders: delivered.length,
    awaiting_delivery: money(
      orders.filter((o) => o.status !== "delivered").reduce((n, o) => n + o.subtotal, 0),
    ),
    transactions: delivered
      .sort((a, b) => deliveredAt(b).getTime() - deliveredAt(a).getTime())
      .slice(0, 200)
      .map((o) => ({
        order_id: o._id,
        delivered_at: deliveredAt(o).toISOString(),
        customer_name: o.customer_name,
        items: o.items.map((i) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          line_total: i.line_total,
        })),
        amount: o.subtotal,
      })),
  };
  res.json(out);
});

sellerRouter.get("/reviews", async (req, res) => {
  const products = await col
    .products()
    .find({ user_id: me(req).id }, { projection: { name: 1 } })
    .toArray();
  const nameById = new Map(products.map((p) => [p._id, p.name]));
  const reviews = await col
    .reviews()
    .find({ product_id: { $in: [...nameById.keys()] } })
    .sort({ created_at: -1 })
    .limit(300)
    .toArray();
  const out: SellerReview[] = reviews.map((r) => ({
    id: r._id,
    author: r.author_name || "CampusCart buyer",
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at.toISOString(),
    product_id: r.product_id,
    product_name: nameById.get(r.product_id) ?? "Product",
  }));
  res.json(out);
});
