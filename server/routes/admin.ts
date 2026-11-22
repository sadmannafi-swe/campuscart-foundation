import { Router } from "express";
import { z } from "zod";
import type { AdminApplication, AdminOrder, StoreOrderSummary } from "../../shared/types";
import { universityBySlug } from "../../shared/universities";
import { signedPrivateUrl } from "../lib/cloudinary";
import { col, toApi } from "../lib/db";
import { badRequest, notFound, parse, requireAdmin } from "../lib/http";
import { orderToApi } from "./orders";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/access", (_req, res) => {
  res.json({ isAdmin: true });
});

adminRouter.get("/applications", async (_req, res) => {
  const stores = await col.stores().find().sort({ created_at: -1 }).limit(1000).toArray();
  const sellerIds = [...new Set(stores.map((s) => s.seller_id))];
  const [sellers, identities] = await Promise.all([
    col
      .sellers()
      .find({ _id: { $in: sellerIds } })
      .toArray(),
    col
      .sellerIdentities()
      .find({ _id: { $in: sellerIds } })
      .toArray(),
  ]);
  const out: AdminApplication[] = stores.map((store) => {
    const seller = sellers.find((s) => s._id === store.seller_id);
    const identity = identities.find((i) => i._id === store.seller_id);
    return {
      store: toApi(store),
      seller: seller ? toApi(seller) : null,
      studentId: identity?.student_id ?? null,
      studentIdImageUrl: signedPrivateUrl(identity?.student_id_image ?? null),
      logoUrl: store.logo_path,
      universityName: universityBySlug(store.university_slug)?.name ?? null,
    } as AdminApplication;
  });
  res.json(out);
});

adminRouter.post("/stores/:id/status", async (req, res) => {
  const body = parse(
    z.object({
      status: z.enum(["pending", "approved", "rejected", "suspended"]),
      reason: z.string().trim().max(300).nullable().optional(),
    }),
    req.body,
  );
  const store = await col.stores().findOneAndUpdate(
    { _id: req.params["id"] },
    {
      $set: {
        status: body.status,
        rejection_reason: body.status === "rejected" ? (body.reason ?? null) : null,
        approved_at: body.status === "approved" ? new Date() : null,
        updated_at: new Date(),
        // Unpublished/rejected stores can't stay featured.
        ...(body.status === "approved" ? {} : { featured_university_slug: null }),
      },
    },
    { returnDocument: "after" },
  );
  if (!store) throw notFound("Store not found");
  await col
    .sellers()
    .updateOne({ _id: store.seller_id }, { $set: { status: body.status, updated_at: new Date() } });
  res.json({ ok: true });
});

adminRouter.get("/orders", async (_req, res) => {
  const orders = await col.orders().find().sort({ created_at: -1 }).limit(2000).toArray();
  const list: AdminOrder[] = orders.map((o) => {
    const { order_items, ...order } = orderToApi(o);
    return { order, items: order_items };
  });
  const summaries: Record<string, StoreOrderSummary> = {};
  for (const { order } of list) {
    const s = (summaries[order.store_id] ??= {
      total: 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      deliveredSales: 0,
    });
    s.total += 1;
    s[order.status] += 1;
    if (order.status === "delivered") s.deliveredSales += Number(order.subtotal);
  }
  res.json({ orders: list, summaries });
});

adminRouter.get("/featurable-products", async (_req, res) => {
  const stores = await col
    .stores()
    .find({ status: "approved" }, { projection: { _id: 1 } })
    .toArray();
  const products = await col
    .products()
    .find({ is_active: true, store_id: { $in: stores.map((s) => s._id) } })
    .sort({ created_at: -1 })
    .limit(2000)
    .toArray();
  res.json(
    products.map((p) => ({
      id: p._id,
      name: p.name,
      price: p.price,
      store_id: p.store_id,
      university_slug: p.university_slug,
      featured_university_slug: p.featured_university_slug,
    })),
  );
});

adminRouter.post("/feature", async (req, res) => {
  const body = parse(
    z.object({
      kind: z.enum(["store", "product"]),
      id: z.string().uuid(),
      universitySlug: z.string().nullable(),
    }),
    req.body,
  );
  if (body.universitySlug && !universityBySlug(body.universitySlug))
    throw badRequest("Unknown university");
  if (body.kind === "store") {
    if (
      body.universitySlug &&
      !(await col.stores().findOne({ _id: body.id, status: "approved" }))
    ) {
      throw badRequest("Only approved stores and products can be featured.");
    }
    await col
      .stores()
      .updateOne({ _id: body.id }, { $set: { featured_university_slug: body.universitySlug } });
  } else {
    const product = await col.products().findOne({ _id: body.id, is_active: true });
    const ok =
      product && (await col.stores().findOne({ _id: product.store_id, status: "approved" }));
    if (body.universitySlug && !ok)
      throw badRequest("Only approved stores and products can be featured.");
    await col
      .products()
      .updateOne({ _id: body.id }, { $set: { featured_university_slug: body.universitySlug } });
  }
  res.json({ ok: true });
});
