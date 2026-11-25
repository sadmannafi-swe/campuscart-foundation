import { Router } from "express";
import { z } from "zod";
import {
  REPORT_TARGETS,
  type AdminApplication,
  type AdminModuleRow,
  type AdminOrder,
  type AdminReport,
  type Moderation,
  type ReportTarget,
  type StoreOrderSummary,
} from "../../shared/types";
import { universityBySlug } from "../../shared/universities";
import { assertOwnImageUrl, signedPrivateUrl, signUpload } from "../lib/cloudinary";
import { col, toApi, type EventDoc } from "../lib/db";
import { badRequest, me, newId, notFound, parse, requireAdmin } from "../lib/http";
import { marketplaceProducts } from "./public";
import { orderToApi } from "./orders";
import { publicOwners } from "../lib/modules";
import { getTarget, moduleCollection } from "../lib/targets";
import { audit } from "../lib/billing";

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
      // An admin's decision replaces any automatic unpaid-fee suspension.
      $unset: { fee_suspension: "" },
    },
    { returnDocument: "before" },
  );
  if (!store) throw notFound("Store not found");
  if (store.status !== body.status)
    await audit({
      actor_id: me(req).id,
      store_id: store._id,
      target_type: "store",
      target_id: store._id,
      action: "manual_store_status",
      previous_status: store.status,
      new_status: body.status,
      note: body.reason ?? null,
    });
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

// ---- Campus modules: Pre-Owned, Blood Donation, BashaLagbe --------------------
// Kept apart from store/product management. Admins can hide (unpublish) or delete
// records and review reports; they never edit what the owner wrote.

const moduleKind = z.enum(REPORT_TARGETS);

function rowFor(kind: ReportTarget, d: Record<string, unknown>) {
  const s = (k: string) => String(d[k] ?? "");
  switch (kind) {
    case "preowned":
      return {
        title: s("title"),
        subtitle: `৳${s("price")} · ${s("location")}`,
        status: s("status"),
      };
    case "blood_request":
      return {
        title: `${s("blood_group")} needed at ${s("hospital_name")}`,
        subtitle: s("hospital_location"),
        status: s("status"),
      };
    case "donor":
      return {
        title: `${s("name")} (${s("blood_group")})`,
        subtitle: s("location"),
        status: s("availability"),
      };
    case "basha":
      return {
        title: s("title"),
        subtitle: `৳${s("rent")}/month · ${s("area")}`,
        status: s("status"),
      };
  }
}

adminRouter.get("/modules/:kind", async (req, res) => {
  const kind = parse(moduleKind, req.params["kind"]);
  const docs = (await moduleCollection(kind)
    .find({})
    .sort({ created_at: -1 })
    .limit(1000)
    .toArray()) as unknown as Array<Record<string, unknown> & { _id: string; owner_id: string }>;
  const [owners, reportCounts] = await Promise.all([
    publicOwners(docs.map((d) => d.owner_id)),
    col
      .reports()
      .aggregate<{ _id: string; n: number }>([
        { $match: { target_type: kind, status: "open" } },
        { $group: { _id: "$target_id", n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const counts = new Map(reportCounts.map((r) => [r._id, r.n]));
  const rows: AdminModuleRow[] = docs.map((d) => ({
    id: d._id,
    ...rowFor(kind, d),
    moderation: d["moderation"] as Moderation,
    owner_id: d.owner_id,
    owner_name: owners.get(d.owner_id)?.name ?? "CampusCart student",
    university_slug: String(d["university_slug"] ?? ""),
    open_reports: counts.get(d._id) ?? 0,
    created_at: (d["created_at"] as Date).toISOString(),
  }));
  res.json(rows);
});

adminRouter.post("/modules/:kind/:id/moderation", async (req, res) => {
  const kind = parse(moduleKind, req.params["kind"]);
  const { moderation } = parse(z.object({ moderation: z.enum(["visible", "hidden"]) }), req.body);
  const r = await moduleCollection(kind).updateOne(
    { _id: req.params["id"] } as never,
    { $set: { moderation, updated_at: new Date() } } as never,
  );
  if (r.matchedCount === 0) throw notFound("Record not found");
  res.json({ ok: true });
});

adminRouter.delete("/modules/:kind/:id", async (req, res) => {
  const kind = parse(moduleKind, req.params["kind"]);
  const id = req.params["id"]!;
  const r = await moduleCollection(kind).deleteOne({ _id: id } as never);
  if (r.deletedCount === 0) throw notFound("Record not found");
  await col
    .reports()
    .updateMany(
      { target_type: kind, target_id: id, status: "open" },
      { $set: { status: "reviewed", reviewed_at: new Date() } },
    );
  res.json({ ok: true });
});

adminRouter.get("/reports", async (req, res) => {
  const status = req.query["status"];
  const filter: Record<string, unknown> = {};
  if (status === "open" || status === "reviewed" || status === "dismissed")
    filter["status"] = status;
  const reports = await col.reports().find(filter).sort({ created_at: -1 }).limit(1000).toArray();
  const reporters = await publicOwners(reports.map((r) => r.reporter_id));
  const out: AdminReport[] = await Promise.all(
    reports.map(async (r) => {
      const target = await getTarget(r.target_type, r.target_id);
      return {
        id: r._id,
        target_type: r.target_type,
        target_id: r.target_id,
        target_title: target?.title ?? null,
        target_moderation: target?.moderation ?? null,
        reporter_id: r.reporter_id,
        reporter_name: reporters.get(r.reporter_id)?.name ?? "CampusCart student",
        reason: r.reason,
        details: r.details,
        status: r.status,
        created_at: r.created_at.toISOString(),
      };
    }),
  );
  res.json(out);
});

adminRouter.patch("/reports/:id", async (req, res) => {
  const { status } = parse(
    z.object({ status: z.enum(["open", "reviewed", "dismissed"]) }),
    req.body,
  );
  const r = await col
    .reports()
    .updateOne(
      { _id: req.params["id"] },
      { $set: { status, reviewed_at: status === "open" ? null : new Date() } },
    );
  if (r.matchedCount === 0) throw notFound("Report not found");
  res.json({ ok: true });
});

// ---- Homepage events -------------------------------------------------------------
// An event is a banner + a list of EXISTING products (by id) shown on a university's
// homepage. At most one event per university is active; activating one turns the
// others off. Admin-only (this router requires an admin).

const eventToApi = (e: EventDoc) => {
  const { created_by: _by, ...rest } = e;
  return toApi(rest);
};

/** Banner uploads go to the admin's own Cloudinary folder (campuscart/event/<id>). */
adminRouter.post("/uploads/sign-event", (req, res) => {
  res.json(signUpload("event", me(req).id));
});

adminRouter.get("/events", async (_req, res) => {
  const list = await col.events().find({}).sort({ is_active: -1, updated_at: -1 }).toArray();
  res.json(list.map(eventToApi));
});

const eventBody = z.object({
  university_slug: z.string().trim().min(2).max(40),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500).default(""),
  banner_url: z.string().trim().max(500),
  product_ids: z.array(z.string().uuid()).max(60).default([]),
  is_active: z.boolean().default(false),
});

/** Every id must be a live listing of an approved store in that marketplace. */
async function checkEventProducts(university: string, ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const found = await marketplaceProducts(university, { _id: { $in: unique } });
  const ok = new Set(found.map((p) => p.id));
  if (unique.some((id) => !ok.has(id)))
    throw badRequest("Some selected products aren't available in this marketplace any more.");
  return unique;
}

async function deactivateOthers(university: string, keepId: string) {
  await col
    .events()
    .updateMany(
      { university_slug: university, is_active: true, _id: { $ne: keepId } },
      { $set: { is_active: false, updated_at: new Date() } },
    );
}

adminRouter.post("/events", async (req, res) => {
  const body = parse(eventBody, req.body);
  if (!universityBySlug(body.university_slug)) throw badRequest("Unknown university");
  const now = new Date();
  const doc: EventDoc = {
    _id: newId(),
    university_slug: body.university_slug,
    title: body.title,
    description: body.description,
    banner_url: assertOwnImageUrl(body.banner_url, "event", me(req).id),
    product_ids: await checkEventProducts(body.university_slug, body.product_ids),
    is_active: body.is_active,
    created_by: me(req).id,
    created_at: now,
    updated_at: now,
  };
  await col.events().insertOne(doc);
  if (doc.is_active) await deactivateOthers(doc.university_slug, doc._id);
  res.status(201).json(eventToApi(doc));
});

adminRouter.patch("/events/:id", async (req, res) => {
  const existing = await col.events().findOne({ _id: req.params["id"] });
  if (!existing) throw notFound("Event not found");
  const body = parse(eventBody.partial(), req.body);
  const university = body.university_slug ?? existing.university_slug;
  if (!universityBySlug(university)) throw badRequest("Unknown university");
  const set: Partial<EventDoc> = { updated_at: new Date(), university_slug: university };
  if (body.title !== undefined) set.title = body.title;
  if (body.description !== undefined) set.description = body.description;
  // a new banner must be this admin's own upload; keeping the current one is always fine
  if (body.banner_url !== undefined && body.banner_url !== existing.banner_url)
    set.banner_url = assertOwnImageUrl(body.banner_url, "event", me(req).id);
  if (body.product_ids !== undefined)
    set.product_ids = await checkEventProducts(university, body.product_ids);
  if (body.is_active !== undefined) set.is_active = body.is_active;
  await col.events().updateOne({ _id: existing._id }, { $set: set });
  const updated = (await col.events().findOne({ _id: existing._id }))!;
  if (updated.is_active) await deactivateOthers(updated.university_slug, updated._id);
  res.json(eventToApi(updated));
});

adminRouter.delete("/events/:id", async (req, res) => {
  const r = await col.events().deleteOne({ _id: req.params["id"] });
  if (r.deletedCount === 0) throw notFound("Event not found");
  res.json({ ok: true });
});
