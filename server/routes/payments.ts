/**
 * Seller payments: the monthly 5% platform fee and featured promotion packages,
 * paid to the admin's personal bKash/Nagad account and verified by hand.
 *
 * Trust model: the browser never chooses the store, seller, amounts, prices,
 * product ownership or any status. The store comes from the signed-in user, every
 * amount is recalculated here, and only an admin (requireAdmin) can confirm,
 * reject or change a payment. Submitting a payment never activates or settles
 * anything by itself.
 */
import { Router } from "express";
import { z } from "zod";
import {
  BILLING_START_MONTH,
  PROMOTION_PACKAGES,
  type AdminPaymentsOverview,
  type AdminPaymentSubmission,
  type AdminPromotion,
  type AdminStorePaymentRow,
  type AdminStorePayments,
  type MonthlySales,
  type PaymentAuditEntry,
  type PaymentConfig,
  type PaymentDisplayStatus,
  type PaymentMethod,
  type PaymentMethodOption,
  type SellerPaymentsOverview,
  type SellerPaymentSubmission,
} from "../../shared/types";
import {
  addMonths,
  audit,
  billingPeriod,
  displayStatus,
  eligibleSales,
  feeFor,
  invoiceToApi,
  isMonthKey,
  money,
  monthEnd,
  monthKeyOf,
  monthLabel,
  monthStart,
  nextPromotionStart,
  notifySeller,
  promotionToApi,
  restoreIfSettled,
  runBillingSweep,
} from "../lib/billing";
import {
  col,
  getClient,
  type PaymentConfigDoc,
  type PaymentSubmissionDoc,
  type PlatformInvoiceDoc,
  type PromotionDoc,
  type StoreDoc,
} from "../lib/db";
import {
  badRequest,
  HttpError,
  me,
  newId,
  notFound,
  parse,
  requireAdmin,
  requireUser,
  uuid,
} from "../lib/http";
import { publicOwners } from "../lib/modules";

// ---- Shared helpers ---------------------------------------------------------------------

const CONFIG_ID = "default";

async function getConfig(): Promise<PaymentConfigDoc> {
  return (
    (await col.paymentConfig().findOne({ _id: CONFIG_ID })) ?? {
      _id: CONFIG_ID,
      bkash_number: "",
      nagad_number: "",
      bkash_enabled: false,
      nagad_enabled: false,
      updated_by: null,
      updated_at: null,
    }
  );
}

/** Only enabled methods with a number set are offered to sellers. */
function enabledMethods(c: PaymentConfigDoc): PaymentMethodOption[] {
  const out: PaymentMethodOption[] = [];
  if (c.bkash_enabled && c.bkash_number) out.push({ method: "bkash", number: c.bkash_number });
  if (c.nagad_enabled && c.nagad_number) out.push({ method: "nagad", number: c.nagad_number });
  return out;
}

/** Bangladeshi mobile number → 01XXXXXXXXX, or null if it isn't one. */
export function normalizeBdPhone(raw: string): string | null {
  let v = raw.replace(/[\s-]/g, "");
  if (v.startsWith("+880")) v = "0" + v.slice(4);
  else if (v.startsWith("880")) v = "0" + v.slice(3);
  return /^01[3-9]\d{8}$/.test(v) ? v : null;
}

/** bKash/Nagad transaction IDs are short letter/digit codes; compare them uppercased. */
export function normalizeTrxId(raw: string): string | null {
  const v = raw.replace(/\s/g, "").toUpperCase();
  return /^[A-Z0-9]{6,20}$/.test(v) ? v : null;
}

const methodName = (m: PaymentMethod) => (m === "bkash" ? "bKash" : "Nagad");

async function productNames(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const list = await col
    .products()
    .find({ _id: { $in: [...new Set(ids)] } }, { projection: { name: 1 } })
    .toArray();
  return new Map(list.map((p) => [p._id, p.name]));
}

function submissionLabel(s: PaymentSubmissionDoc): string {
  if (s.type === "platform_fee")
    return `${s.billing_month ? monthLabel(s.billing_month) : "Monthly"} platform fee`;
  return PROMOTION_PACKAGES.find((p) => p.id === s.package_id)?.name ?? "Featured promotion";
}

function sellerSubmission(s: PaymentSubmissionDoc): SellerPaymentSubmission {
  return {
    id: s._id,
    type: s.type,
    label: submissionLabel(s),
    invoice_id: s.invoice_id,
    promotion_id: s.promotion_id,
    method: s.method,
    sender_phone: s.sender_phone,
    receiver_number: s.receiver_number,
    trx_id: s.trx_id,
    expected_amount: s.expected_amount,
    submitted_amount: s.submitted_amount,
    status: s.status,
    rejection_reason: s.rejection_reason,
    submitted_at: s.submitted_at.toISOString(),
    verified_at: s.verified_at?.toISOString() ?? null,
  };
}

function adminSubmission(
  s: PaymentSubmissionDoc,
  names: Map<string, string>,
): AdminPaymentSubmission {
  return {
    ...sellerSubmission(s),
    store_id: s.store_id,
    store_name: s.store_name,
    seller_id: s.seller_id,
    seller_name: s.seller_name,
    seller_email: s.seller_email,
    billing_month: s.billing_month,
    package_id: s.package_id,
    package_name: s.package_id
      ? (PROMOTION_PACKAGES.find((p) => p.id === s.package_id)?.name ?? null)
      : null,
    products: s.product_ids.map((id) => ({ id, name: names.get(id) ?? "Removed product" })),
    amount_difference: money(s.submitted_amount - s.expected_amount),
    verified_amount: s.verified_amount,
    verified_by: s.verified_by,
    admin_note: s.admin_note,
  };
}

/** Run the billing sweep without ever failing the page that triggered it. */
async function sweepQuietly() {
  try {
    await runBillingSweep(new Date());
  } catch (err) {
    console.error("[billing] sweep failed", err);
  }
}

/** Sales, fee and invoice of one store for one Dhaka month (live from orders). */
async function monthSummary(store: StoreDoc, key: string, now: Date): Promise<MonthlySales> {
  const salesStart = new Date(Math.max(monthStart(key).getTime(), store.created_at.getTime()));
  const end = monthEnd(key);
  const period = billingPeriod(store.created_at, key);
  const { sales, orders } =
    salesStart < end ? await eligibleSales(store._id, salesStart, end) : { sales: 0, orders: 0 };
  const invoice = await col.invoices().findOne({ store_id: store._id, billing_month: key });
  // A billable month's fee is computed on the billable part only.
  const billable = period
    ? period.start.getTime() === salesStart.getTime()
      ? { sales, orders }
      : await eligibleSales(store._id, period.start, period.end)
    : null;
  return {
    month: key,
    period_start: period
      ? period.start.toISOString()
      : salesStart < end
        ? salesStart.toISOString()
        : null,
    period_end: end.toISOString(),
    billable: !!period,
    eligible_sales: invoice?.eligible_sales ?? billable?.sales ?? sales,
    order_count: invoice?.order_count ?? billable?.orders ?? orders,
    fee: invoice?.fee ?? (billable ? feeFor(billable.sales) : 0),
    invoice: invoice ? invoiceToApi(invoice, now) : null,
  };
}

// ---- Seller ------------------------------------------------------------------------------

export const sellerPaymentsRouter = Router();
sellerPaymentsRouter.use(requireUser);

async function myStore(userId: string): Promise<StoreDoc> {
  const store = await col.stores().findOne({ user_id: userId });
  if (!store) throw notFound("Create your store first");
  return store;
}

sellerPaymentsRouter.get("/payments", async (req, res) => {
  const store = await myStore(me(req).id);
  await sweepQuietly();
  const now = new Date();
  const current = monthKeyOf(now);
  const period = billingPeriod(store.created_at, current);
  const live = period ? await eligibleSales(store._id, period.start, period.end) : null;
  const [fresh, invoices, config, promotions, submissions] = await Promise.all([
    col.stores().findOne({ _id: store._id }),
    col.invoices().find({ store_id: store._id }).sort({ billing_month: -1 }).limit(60).toArray(),
    getConfig(),
    col.promotions().find({ store_id: store._id }).sort({ created_at: -1 }).limit(100).toArray(),
    col
      .paymentSubmissions()
      .find({ store_id: store._id })
      .sort({ submitted_at: -1 })
      .limit(200)
      .toArray(),
  ]);
  const names = await productNames(promotions.flatMap((p) => p.product_ids));
  const out: SellerPaymentsOverview = {
    store_status: (fresh ?? store).status,
    fee_suspended: !!(fresh ?? store).fee_suspension,
    billing_starts: BILLING_START_MONTH,
    current_month: {
      month: current,
      period_start: period ? period.start.toISOString() : null,
      sales: live?.sales ?? 0,
      estimated_fee: live ? feeFor(live.sales) : 0,
      billable: !!period,
    },
    invoices: invoices.map((i) => invoiceToApi(i, now)),
    methods: enabledMethods(config),
    packages: PROMOTION_PACKAGES,
    promotions: promotions.map((p) => promotionToApi(p, names, now)),
    submissions: submissions.map(sellerSubmission),
  };
  res.json(out);
});

const promotionSchema = z.object({
  package_id: z.enum(["starter", "growth", "premium", "business"]),
  product_ids: z.array(uuid).min(1, "Choose at least one product").max(30),
});

/** Choose a package and products. Nothing is featured until an admin confirms payment. */
sellerPaymentsRouter.post("/promotions", async (req, res) => {
  const u = me(req);
  const store = await myStore(u.id);
  if (store.status !== "approved")
    throw badRequest("Your store must be published to buy a featured promotion.");
  const body = parse(promotionSchema, req.body);
  const pkg = PROMOTION_PACKAGES.find((p) => p.id === body.package_id)!;
  const ids = [...new Set(body.product_ids)];
  if (ids.length > pkg.max_products)
    throw badRequest(`${pkg.name} features up to ${pkg.max_products} products.`);
  const owned = await col
    .products()
    .countDocuments({ _id: { $in: ids }, store_id: store._id, is_active: true });
  if (owned !== ids.length)
    throw badRequest("You can only promote active products from your own store.");
  const open = await col.promotions().countDocuments({
    store_id: store._id,
    status: { $in: ["awaiting_payment", "payment_submitted", "payment_rejected"] },
  });
  if (open >= 3) throw new HttpError(409, "Finish or cancel your unpaid promotion requests first.");
  const now = new Date();
  const doc: PromotionDoc = {
    _id: newId(),
    store_id: store._id,
    seller_id: store.seller_id,
    seller_user_id: u.id,
    university_slug: store.university_slug,
    package_id: pkg.id,
    package_name: pkg.name,
    price: pkg.price,
    duration_days: pkg.days,
    duration_hours: pkg.days * 24,
    product_ids: ids,
    status: "awaiting_payment",
    payment_submission_id: null,
    starts_at: null,
    expires_at: null,
    approved_by: null,
    approved_at: null,
    created_at: now,
    updated_at: now,
  };
  await col.promotions().insertOne(doc);
  res.status(201).json(promotionToApi(doc, await productNames(ids), now));
});

/** Drop a promotion request that hasn't been paid (or whose payment was rejected). */
sellerPaymentsRouter.delete("/promotions/:id", async (req, res) => {
  const store = await myStore(me(req).id);
  const r = await col.promotions().updateOne(
    {
      _id: req.params["id"],
      store_id: store._id,
      status: { $in: ["awaiting_payment", "payment_rejected"] },
    },
    { $set: { status: "cancelled", updated_at: new Date() } },
  );
  if (!r.matchedCount) throw new HttpError(409, "This promotion can't be cancelled.");
  res.json({ ok: true });
});

const submitSchema = z.object({
  type: z.enum(["platform_fee", "promotion"]),
  invoice_id: uuid.optional(),
  promotion_id: uuid.optional(),
  method: z.enum(["bkash", "nagad"]),
  sender_phone: z.string().trim().max(20),
  trx_id: z.string().trim().max(40),
  amount: z.number().positive("Enter the amount you sent").max(1_000_000),
  confirmed: z.literal(true, {
    errorMap: () => ({ message: "Please confirm that you have sent the money." }),
  }),
});

/**
 * Record a bKash/Nagad payment for an invoice or promotion. Store and seller details
 * come from the session; the expected amount from the database. The record waits
 * for an admin (PENDING_VERIFICATION); nothing is marked paid or activated here.
 */
sellerPaymentsRouter.post("/payments", async (req, res) => {
  const u = me(req);
  const store = await myStore(u.id);
  const body = parse(submitSchema, req.body);
  const sender = normalizeBdPhone(body.sender_phone);
  if (!sender) throw badRequest("Enter the 11-digit mobile number you sent the money from.");
  const trx = normalizeTrxId(body.trx_id);
  if (!trx) throw badRequest("Enter the transaction ID (TrxID) from your payment message.");
  const option = enabledMethods(await getConfig()).find((m) => m.method === body.method);
  if (!option) throw badRequest(`${methodName(body.method)} payments are not available right now.`);

  let invoice: PlatformInvoiceDoc | null = null;
  let promo: PromotionDoc | null = null;
  if (body.type === "platform_fee") {
    if (!body.invoice_id) throw badRequest("Choose the platform fee you are paying.");
    invoice = await col.invoices().findOne({ _id: body.invoice_id, store_id: store._id });
    if (!invoice) throw notFound("Invoice not found");
    if (invoice.status === "submitted")
      throw new HttpError(409, "A payment for this fee is already waiting for verification.");
    if (invoice.status !== "pending" && invoice.status !== "rejected")
      throw new HttpError(409, "This platform fee doesn't need a payment.");
  } else {
    if (!body.promotion_id) throw badRequest("Choose the promotion you are paying for.");
    promo = await col.promotions().findOne({ _id: body.promotion_id, store_id: store._id });
    if (!promo) throw notFound("Promotion not found");
    if (promo.status === "payment_submitted")
      throw new HttpError(409, "A payment for this promotion is already waiting for verification.");
    if (promo.status !== "awaiting_payment" && promo.status !== "payment_rejected")
      throw new HttpError(409, "This promotion doesn't need a payment.");
  }

  const seller = await col.sellers().findOne({ _id: store.seller_id });
  const now = new Date();
  const obligation = invoice ? `platform_fee:${invoice._id}` : `promotion:${promo!._id}`;
  const doc: PaymentSubmissionDoc = {
    _id: newId(),
    store_id: store._id,
    seller_id: store.seller_id,
    seller_user_id: u.id,
    store_name: store.name,
    seller_name: seller?.full_name || u.name || "Seller",
    seller_email: seller?.email || u.email,
    type: body.type,
    invoice_id: invoice?._id ?? null,
    promotion_id: promo?._id ?? null,
    billing_month: invoice?.billing_month ?? null,
    package_id: promo?.package_id ?? null,
    product_ids: promo?.product_ids ?? [],
    method: body.method,
    sender_phone: sender,
    receiver_number: option.number,
    trx_id: trx,
    expected_amount: invoice ? invoice.fee : promo!.price,
    submitted_amount: money(body.amount),
    status: "pending_verification",
    open_key: obligation,
    trx_key: `${body.method}:${trx}`,
    verified_amount: null,
    verified_by: null,
    verified_at: null,
    rejection_reason: null,
    admin_note: null,
    submitted_at: now,
    updated_at: now,
  };

  const session = getClient().startSession();
  try {
    await session.withTransaction(async () => {
      await col.paymentSubmissions().insertOne(doc, { session });
      const moved = invoice
        ? await col
            .invoices()
            .updateOne(
              { _id: invoice._id, status: { $in: ["pending", "rejected"] } },
              { $set: { status: "submitted", payment_submission_id: doc._id, updated_at: now } },
              { session },
            )
        : await col.promotions().updateOne(
            { _id: promo!._id, status: { $in: ["awaiting_payment", "payment_rejected"] } },
            {
              $set: {
                status: "payment_submitted",
                payment_submission_id: doc._id,
                updated_at: now,
              },
            },
            { session },
          );
      if (!moved.modifiedCount)
        throw new HttpError(409, "This changed meanwhile — refresh and try again.");
    });
  } catch (err) {
    const e = err as { code?: number; keyPattern?: Record<string, unknown> };
    if (e.code === 11000) {
      if (e.keyPattern?.["trx_key"])
        throw new HttpError(409, "This transaction ID has already been submitted.");
      throw new HttpError(409, "A payment for this is already waiting for verification.");
    }
    throw err;
  } finally {
    await session.endSession();
  }
  res.status(201).json(sellerSubmission(doc));
});

// ---- Admin -------------------------------------------------------------------------------

export const adminPaymentsRouter = Router();
adminPaymentsRouter.use(requireAdmin);

const UNPAID = ["pending", "submitted", "rejected"] as const;
/** Most urgent first: a store shows the most urgent state of any of its bills. */
const URGENCY: PaymentDisplayStatus[] = [
  "overdue",
  "rejected",
  "submitted",
  "pending",
  "paid",
  "waived",
  "not_due",
];

/** Delivered sales per store in [start, end). */
async function salesByStore(start: Date, end: Date): Promise<Map<string, number>> {
  const rows = await col
    .orders()
    .aggregate<{ _id: string; sales: number }>([
      { $match: { status: "delivered" } },
      { $addFields: { at: { $ifNull: ["$delivered_at", "$updated_at"] } } },
      { $match: { at: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: "$store_id",
          sales: {
            $sum: { $max: [0, { $subtract: ["$subtotal", { $ifNull: ["$refunded_amount", 0] }] }] },
          },
        },
      },
    ])
    .toArray();
  return new Map(rows.map((r) => [r._id, money(r.sales)]));
}

adminPaymentsRouter.get("/overview", async (_req, res) => {
  await sweepQuietly();
  const now = new Date();
  const current = monthKeyOf(now);
  const previous = addMonths(current, -1);
  const [stores, curSales, prevSales, invoices, unpaid, paidRows, promos, pending] =
    await Promise.all([
      col.stores().find({}).sort({ created_at: -1 }).limit(2000).toArray(),
      salesByStore(monthStart(current), monthEnd(current)),
      salesByStore(monthStart(previous), monthEnd(previous)),
      col.invoices().find({ billing_month: previous }).toArray(),
      col
        .invoices()
        .find({ status: { $in: [...UNPAID] }, fee: { $gt: 0 } })
        .toArray(),
      col
        .paymentSubmissions()
        .aggregate<{ _id: string; at: Date }>([
          { $match: { status: "confirmed" } },
          { $group: { _id: "$store_id", at: { $max: "$verified_at" } } },
        ])
        .toArray(),
      col
        .promotions()
        .find({ status: "active", starts_at: { $lte: now }, expires_at: { $gt: now } })
        .toArray(),
      col.paymentSubmissions().find({ status: "pending_verification" }).toArray(),
    ]);
  const sellers = await col
    .sellers()
    .find({ _id: { $in: stores.map((s) => s.seller_id) } })
    .toArray();
  const sellerById = new Map(sellers.map((s) => [s._id, s]));
  const invByStore = new Map(invoices.map((i) => [i.store_id, i]));
  const paidAt = new Map(paidRows.map((r) => [r._id, r.at]));
  const pendingStores = new Set(pending.map((p) => p.store_id));

  const rows: AdminStorePaymentRow[] = stores.map((s) => {
    const inv = invByStore.get(s._id);
    const statuses = unpaid.filter((i) => i.store_id === s._id).map((i) => displayStatus(i, now));
    const prevPeriod = billingPeriod(s.created_at, previous);
    const prevSalesAmt = prevSales.get(s._id) ?? 0;
    statuses.push(inv ? displayStatus(inv, now) : "not_due");
    const status = URGENCY.find((u) => statuses.includes(u)) ?? "not_due";
    const promo = promos.find((p) => p.store_id === s._id);
    const seller = sellerById.get(s.seller_id);
    return {
      store_id: s._id,
      store_name: s.name,
      seller_name: seller?.full_name ?? "Seller",
      seller_email: seller?.email ?? "",
      university_slug: s.university_slug,
      store_created_at: s.created_at.toISOString(),
      store_status: s.status,
      fee_suspended: !!s.fee_suspension,
      current_month_sales: curSales.get(s._id) ?? 0,
      previous_month: previous,
      previous_month_sales: prevSalesAmt,
      previous_month_fee: inv?.fee ?? (prevPeriod ? feeFor(prevSalesAmt) : 0),
      payment_status: status,
      last_payment_at: paidAt.get(s._id)?.toISOString() ?? null,
      has_pending_submission: pendingStores.has(s._id),
      active_promotion: promo
        ? { package_name: promo.package_name, expires_at: promo.expires_at!.toISOString() }
        : null,
    };
  });
  const out: AdminPaymentsOverview = {
    now: now.toISOString(),
    current_month: current,
    previous_month: previous,
    stores: rows,
    pending_count: pending.length,
  };
  res.json(out);
});

adminPaymentsRouter.get("/submissions", async (req, res) => {
  const status = req.query["status"];
  const filter: Record<string, unknown> = {};
  if (status === "pending_verification" || status === "confirmed" || status === "rejected")
    filter["status"] = status;
  const list = await col
    .paymentSubmissions()
    .find(filter)
    .sort({ submitted_at: status === "pending_verification" ? 1 : -1 })
    .limit(500)
    .toArray();
  const names = await productNames(list.flatMap((s) => s.product_ids));
  res.json(list.map((s) => adminSubmission(s, names)));
});

async function adminPromotions(filter: Record<string, unknown>): Promise<AdminPromotion[]> {
  const now = new Date();
  const list = await col.promotions().find(filter).sort({ created_at: -1 }).limit(500).toArray();
  const [names, stores] = await Promise.all([
    productNames(list.flatMap((p) => p.product_ids)),
    col
      .stores()
      .find({ _id: { $in: list.map((p) => p.store_id) } }, { projection: { name: 1 } })
      .toArray(),
  ]);
  const storeName = new Map(stores.map((s) => [s._id, s.name]));
  return list.map((p) => ({
    ...promotionToApi(p, names, now),
    store_id: p.store_id,
    store_name: storeName.get(p.store_id) ?? "Store",
    approved_by: p.approved_by,
    approved_at: p.approved_at?.toISOString() ?? null,
  }));
}

adminPaymentsRouter.get("/promotions", async (_req, res) => {
  res.json(await adminPromotions({ status: { $ne: "cancelled" } }));
});

async function auditEntries(filter: Record<string, unknown>): Promise<PaymentAuditEntry[]> {
  const list = await col.paymentAudit().find(filter).sort({ created_at: -1 }).limit(300).toArray();
  const owners = await publicOwners(list.map((a) => a.actor_id).filter((id) => id !== "system"));
  return list.map((a) => ({
    id: a._id,
    actor_id: a.actor_id,
    actor_name: a.actor_id === "system" ? "System" : (owners.get(a.actor_id)?.name ?? "Admin"),
    store_id: a.store_id,
    target_type: a.target_type,
    target_id: a.target_id,
    action: a.action,
    previous_status: a.previous_status,
    new_status: a.new_status,
    note: a.note,
    created_at: a.created_at.toISOString(),
  }));
}

adminPaymentsRouter.get("/audit", async (req, res) => {
  const storeId = req.query["store_id"];
  res.json(await auditEntries(typeof storeId === "string" && storeId ? { store_id: storeId } : {}));
});

async function storeOr404(id: string | undefined): Promise<StoreDoc> {
  const store = id ? await col.stores().findOne({ _id: id }) : null;
  if (!store) throw notFound("Store not found");
  return store;
}

adminPaymentsRouter.get("/stores/:id", async (req, res) => {
  await sweepQuietly();
  const store = await storeOr404(req.params["id"]);
  const now = new Date();
  const seller = await col.sellers().findOne({ _id: store.seller_id });
  // Monthly history: from the store's first month (December 2026 included, free) to now.
  const first = monthKeyOf(store.created_at);
  const months: MonthlySales[] = [];
  for (let key = monthKeyOf(now), n = 0; key >= first && n < 24; key = addMonths(key, -1), n++)
    months.push(await monthSummary(store, key, now));
  const [invoices, subs] = await Promise.all([
    col.invoices().find({ store_id: store._id }).sort({ billing_month: -1 }).toArray(),
    col.paymentSubmissions().find({ store_id: store._id }).sort({ submitted_at: -1 }).toArray(),
  ]);
  const names = await productNames(subs.flatMap((s) => s.product_ids));
  const out: AdminStorePayments = {
    store: {
      id: store._id,
      name: store.name,
      status: store.status,
      fee_suspended: !!store.fee_suspension,
      created_at: store.created_at.toISOString(),
      university_slug: store.university_slug,
    },
    seller: {
      id: store.seller_id,
      name: seller?.full_name ?? "Seller",
      email: seller?.email ?? "",
      phone: seller?.phone ?? "",
    },
    months,
    invoices: invoices.map((i) => invoiceToApi(i, now)),
    submissions: subs.map((s) => adminSubmission(s, names)),
    promotions: await adminPromotions({ store_id: store._id }),
    audit: await auditEntries({ store_id: store._id }),
  };
  res.json(out);
});

/** Any month of one store: exactly what it sold and what fee applies. */
adminPaymentsRouter.get("/stores/:id/month", async (req, res) => {
  const store = await storeOr404(req.params["id"]);
  const month = req.query["month"];
  if (!isMonthKey(month)) throw badRequest("Choose a month (YYYY-MM).");
  res.json(await monthSummary(store, month, new Date()));
});

const confirmSchema = z.object({
  verified_amount: z.number().min(0).max(1_000_000),
  note: z.string().trim().max(500).optional(),
});

/**
 * Confirm a payment the admin has found in the bKash/Nagad account. Platform fee →
 * invoice PAID (and the store re-published if that was the only reason it was
 * hidden). Promotion → active from now, or from the end of the store's current
 * promotion, for exactly its number of hours.
 */
adminPaymentsRouter.post("/submissions/:id/confirm", async (req, res) => {
  const admin = me(req);
  const body = parse(confirmSchema, req.body);
  const session = getClient().startSession();
  let result: { starts_at?: string; expires_at?: string } = {};
  try {
    await session.withTransaction(async () => {
      result = {};
      const now = new Date();
      const sub = await col.paymentSubmissions().findOneAndUpdate(
        { _id: req.params["id"], status: "pending_verification" },
        {
          $set: {
            status: "confirmed",
            verified_amount: money(body.verified_amount),
            verified_by: admin.id,
            verified_at: now,
            updated_at: now,
            ...(body.note ? { admin_note: body.note } : {}),
          },
          $unset: { open_key: "" },
        },
        { session, returnDocument: "after" },
      );
      if (!sub) throw new HttpError(409, "This payment is no longer waiting for verification.");
      if (sub.type === "platform_fee") {
        const inv = await col.invoices().findOneAndUpdate(
          { _id: sub.invoice_id!, status: "submitted", payment_submission_id: sub._id },
          {
            $set: {
              status: "paid",
              paid_amount: money(body.verified_amount),
              paid_at: now,
              verified_by: admin.id,
              updated_at: now,
            },
          },
          { session },
        );
        if (!inv)
          throw new HttpError(409, "The invoice changed meanwhile — refresh and try again.");
        await audit(
          {
            actor_id: admin.id,
            store_id: sub.store_id,
            target_type: "invoice",
            target_id: inv._id,
            action: "confirm_payment",
            previous_status: "submitted",
            new_status: "paid",
            note:
              body.note ??
              `Verified ৳${money(body.verified_amount)} via ${methodName(sub.method)} (${sub.trx_id})`,
          },
          session,
        );
        await notifySeller(
          sub.seller_user_id,
          "payment_confirmed",
          "Platform fee payment confirmed",
          `Your ${monthLabel(inv.billing_month)} platform fee is paid. Thank you!`,
          session,
        );
        await restoreIfSettled(sub.store_id, admin.id, session);
      } else {
        const promo = await col.promotions().findOne({ _id: sub.promotion_id! }, { session });
        if (!promo || promo.status !== "payment_submitted")
          throw new HttpError(409, "The promotion changed meanwhile — refresh and try again.");
        const starts = await nextPromotionStart(promo.store_id, now, session);
        const expires = new Date(starts.getTime() + promo.duration_hours * 3600_000);
        await col.promotions().updateOne(
          { _id: promo._id, status: "payment_submitted" },
          {
            $set: {
              status: "active",
              starts_at: starts,
              expires_at: expires,
              approved_by: admin.id,
              approved_at: now,
              updated_at: now,
            },
          },
          { session },
        );
        result = { starts_at: starts.toISOString(), expires_at: expires.toISOString() };
        await audit(
          {
            actor_id: admin.id,
            store_id: sub.store_id,
            target_type: "promotion",
            target_id: promo._id,
            action: "confirm_payment_activate_promotion",
            previous_status: "payment_submitted",
            new_status: "active",
            note:
              body.note ??
              `Verified ৳${money(body.verified_amount)} via ${methodName(sub.method)} (${sub.trx_id})`,
          },
          session,
        );
        const when =
          starts.getTime() === now.getTime()
            ? "is live now"
            : `starts ${starts.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })}, after your current promotion`;
        await notifySeller(
          sub.seller_user_id,
          "promotion_active",
          `${promo.package_name} confirmed`,
          `Payment confirmed — your promotion ${when} and runs for ${promo.duration_days} days.`,
          session,
        );
      }
    });
  } finally {
    await session.endSession();
  }
  res.json({ ok: true, ...result });
});

const rejectSchema = z.object({
  reason: z.string().trim().min(3, "Tell the seller why the payment was rejected.").max(300),
  note: z.string().trim().max(500).optional(),
});

/** Reject: the fee stays unpaid / the promotion stays off; the seller can submit again. */
adminPaymentsRouter.post("/submissions/:id/reject", async (req, res) => {
  const admin = me(req);
  const body = parse(rejectSchema, req.body);
  const session = getClient().startSession();
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const sub = await col.paymentSubmissions().findOneAndUpdate(
        { _id: req.params["id"], status: "pending_verification" },
        {
          $set: {
            status: "rejected",
            rejection_reason: body.reason,
            verified_by: admin.id,
            verified_at: now,
            updated_at: now,
            ...(body.note ? { admin_note: body.note } : {}),
          },
          // Free the bill and the TrxID so a corrected payment can be submitted.
          $unset: { open_key: "", trx_key: "" },
        },
        { session, returnDocument: "after" },
      );
      if (!sub) throw new HttpError(409, "This payment is no longer waiting for verification.");
      if (sub.type === "platform_fee") {
        await col
          .invoices()
          .updateOne(
            { _id: sub.invoice_id!, status: "submitted" },
            { $set: { status: "rejected", updated_at: now } },
            { session },
          );
      } else {
        await col
          .promotions()
          .updateOne(
            { _id: sub.promotion_id!, status: "payment_submitted" },
            { $set: { status: "payment_rejected", updated_at: now } },
            { session },
          );
      }
      await audit(
        {
          actor_id: admin.id,
          store_id: sub.store_id,
          target_type: "submission",
          target_id: sub._id,
          action: "reject_payment",
          previous_status: "pending_verification",
          new_status: "rejected",
          note: body.reason + (body.note ? ` — ${body.note}` : ""),
        },
        session,
      );
      await notifySeller(
        sub.seller_user_id,
        "payment_rejected",
        "Payment could not be verified",
        `${submissionLabel(sub)}: ${body.reason}. Please check and submit the payment again.`,
        session,
      );
    });
  } finally {
    await session.endSession();
  }
  res.json({ ok: true });
});

adminPaymentsRouter.post("/submissions/:id/note", async (req, res) => {
  const { note } = parse(z.object({ note: z.string().trim().min(1).max(500) }), req.body);
  const sub = await col
    .paymentSubmissions()
    .findOneAndUpdate(
      { _id: req.params["id"] },
      { $set: { admin_note: note, updated_at: new Date() } },
    );
  if (!sub) throw notFound("Payment not found");
  await audit({
    actor_id: me(req).id,
    store_id: sub.store_id,
    target_type: "submission",
    target_id: sub._id,
    action: "add_note",
    previous_status: sub.status,
    new_status: sub.status,
    note,
  });
  res.json({ ok: true });
});

const invoiceStatusSchema = z.object({
  status: z.enum(["paid", "pending", "waived"]),
  note: z.string().trim().min(3, "Add a reason for this change.").max(500),
  paid_amount: z.number().min(0).max(1_000_000).optional(),
});

/**
 * Manual invoice changes (e.g. paid in cash, waived, or undoing a mistake). A fee
 * with a payment waiting for verification must be confirmed/rejected instead.
 */
adminPaymentsRouter.post("/invoices/:id/status", async (req, res) => {
  const admin = me(req);
  const body = parse(invoiceStatusSchema, req.body);
  const inv = await col.invoices().findOne({ _id: req.params["id"] });
  if (!inv) throw notFound("Invoice not found");
  if (inv.status === "not_due") throw badRequest("There is no fee to collect for this month.");
  if (inv.status === "submitted")
    throw new HttpError(409, "Confirm or reject the payment waiting for verification instead.");
  if (inv.status === body.status) return res.json({ ok: true });
  const allowed: Record<string, string[]> = {
    paid: ["pending", "rejected"],
    waived: ["pending", "rejected"],
    pending: ["paid", "waived", "rejected"],
  };
  if (!allowed[body.status]!.includes(inv.status))
    throw badRequest(`A ${inv.status} invoice can't be changed to ${body.status}.`);
  const now = new Date();
  const set: Partial<PlatformInvoiceDoc> =
    body.status === "paid"
      ? {
          status: "paid",
          paid_amount: money(body.paid_amount ?? inv.fee),
          paid_at: now,
          verified_by: admin.id,
        }
      : body.status === "waived"
        ? { status: "waived", verified_by: admin.id }
        : // back to unpaid: the next sweep re-checks the deadline
          {
            status: "pending",
            paid_amount: null,
            paid_at: null,
            verified_by: null,
            overdue: false,
          };
  const r = await col
    .invoices()
    .updateOne({ _id: inv._id, status: inv.status }, { $set: { ...set, updated_at: now } });
  if (!r.modifiedCount)
    throw new HttpError(409, "The invoice changed meanwhile — refresh and try again.");
  await audit({
    actor_id: admin.id,
    store_id: inv.store_id,
    target_type: "invoice",
    target_id: inv._id,
    action: "manual_invoice_status",
    previous_status: inv.status,
    new_status: body.status,
    note: body.note,
  });
  if (body.status !== "pending") await restoreIfSettled(inv.store_id, admin.id);
  return res.json({ ok: true });
});

/** Manually unpublish or re-publish a store (overrides any fee suspension). */
adminPaymentsRouter.post("/stores/:id/publication", async (req, res) => {
  const admin = me(req);
  const body = parse(
    z.object({
      action: z.enum(["suspend", "republish"]),
      note: z.string().trim().min(3, "Add a reason for this change.").max(500),
    }),
    req.body,
  );
  const store = await storeOr404(req.params["id"]);
  const from = body.action === "suspend" ? "approved" : "suspended";
  const to = body.action === "suspend" ? "suspended" : "approved";
  if (store.status !== from)
    throw badRequest(
      body.action === "suspend"
        ? "Only a published store can be unpublished."
        : "Only an unpublished store can be re-published.",
    );
  const now = new Date();
  await col.stores().updateOne(
    { _id: store._id, status: from },
    {
      $set: {
        status: to,
        updated_at: now,
        ...(to === "approved" ? { approved_at: now } : { featured_university_slug: null }),
      },
      $unset: { fee_suspension: "" },
    },
  );
  await col
    .sellers()
    .updateOne({ _id: store.seller_id }, { $set: { status: to, updated_at: now } });
  await audit({
    actor_id: admin.id,
    store_id: store._id,
    target_type: "store",
    target_id: store._id,
    action: body.action === "suspend" ? "manual_suspend" : "manual_republish",
    previous_status: store.status,
    new_status: to,
    note: body.note,
  });
  res.json({ ok: true });
});

adminPaymentsRouter.get("/config", async (_req, res) => {
  const c = await getConfig();
  const out: PaymentConfig = {
    bkash_number: c.bkash_number,
    nagad_number: c.nagad_number,
    bkash_enabled: c.bkash_enabled,
    nagad_enabled: c.nagad_enabled,
    updated_by: c.updated_by,
    updated_at: c.updated_at?.toISOString() ?? null,
  };
  res.json(out);
});

const phoneOrEmpty = z
  .string()
  .trim()
  .max(20)
  .transform((v, ctx) => {
    if (!v) return "";
    const n = normalizeBdPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter an 11-digit Bangladeshi mobile number." });
      return z.NEVER;
    }
    return n;
  });

adminPaymentsRouter.put("/config", async (req, res) => {
  const admin = me(req);
  const body = parse(
    z.object({
      bkash_number: phoneOrEmpty,
      nagad_number: phoneOrEmpty,
      bkash_enabled: z.boolean(),
      nagad_enabled: z.boolean(),
    }),
    req.body,
  );
  if (body.bkash_enabled && !body.bkash_number)
    throw badRequest("Add the bKash number before enabling bKash.");
  if (body.nagad_enabled && !body.nagad_number)
    throw badRequest("Add the Nagad number before enabling Nagad.");
  const before = await getConfig();
  await col
    .paymentConfig()
    .updateOne(
      { _id: CONFIG_ID },
      { $set: { ...body, updated_by: admin.id, updated_at: new Date() } },
      { upsert: true },
    );
  const describe = (
    c: Pick<PaymentConfigDoc, "bkash_enabled" | "nagad_enabled" | "bkash_number" | "nagad_number">,
  ) =>
    `bKash ${c.bkash_enabled ? "on" : "off"} ${c.bkash_number || "—"}; Nagad ${c.nagad_enabled ? "on" : "off"} ${c.nagad_number || "—"}`;
  await audit({
    actor_id: admin.id,
    store_id: null,
    target_type: "config",
    target_id: CONFIG_ID,
    action: "update_payment_numbers",
    previous_status: describe(before),
    new_status: describe(body),
    note: null,
  });
  res.json({ ok: true });
});

/** Run invoicing / overdue / expiry now (the daily cron does this too). */
adminPaymentsRouter.post("/run-billing", async (_req, res) => {
  res.json(await runBillingSweep(new Date(), { force: true }));
});
