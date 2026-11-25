/**
 * Seller billing: the 5% monthly platform fee, overdue suspension and featured
 * promotion expiry. Every step here is idempotent, so the daily cron and the
 * on-demand sweeps (seller/admin payment pages) can all run it safely, any number
 * of times, concurrently:
 *
 *  - one invoice per store per month (unique index on store_id + billing_month,
 *    written with $setOnInsert);
 *  - a `billing_runs` marker per month so finished months are skipped cheaply;
 *  - state changes are compare-and-set (`overdue: false` → true, `status: "active"`
 *    → "expired"), so two runs can never act twice.
 *
 * Time: timestamps are stored in UTC; months, periods and deadlines are Asia/Dhaka
 * (UTC+6 all year, no daylight saving).
 */
import type { ClientSession } from "mongodb";
import {
  BILLING_START_MONTH,
  PLATFORM_FEE_PERCENT,
  type InvoiceStatus,
  type PaymentDisplayStatus,
  type PlatformInvoice,
  type PromotionStatus,
  type SellerPromotion,
} from "../../shared/types";
import {
  col,
  type PaymentAuditDoc,
  type PlatformInvoiceDoc,
  type PromotionDoc,
  type StoreDoc,
} from "./db";
import { newId } from "./http";

// ---- Asia/Dhaka calendar --------------------------------------------------------------

const DHAKA_OFFSET_MS = 6 * 3600_000;
const DAY_MS = 24 * 3600_000;

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM" of the Dhaka calendar month containing `d`. */
export function monthKeyOf(d: Date): string {
  const local = new Date(d.getTime() + DHAKA_OFFSET_MS);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}`;
}

export function isMonthKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

function parseMonth(key: string): [number, number] {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return [y, m - 1];
}

/** First instant of the Dhaka month (as a UTC Date). */
export function monthStart(key: string): Date {
  const [y, m] = parseMonth(key);
  return new Date(Date.UTC(y, m, 1) - DHAKA_OFFSET_MS);
}

export function addMonths(key: string, n: number): string {
  const [y, m] = parseMonth(key);
  const d = new Date(Date.UTC(y, m + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** First instant AFTER the month (exclusive end). */
export const monthEnd = (key: string) => monthStart(addMonths(key, 1));

/**
 * Payment deadline for a month's fee: the whole of the 10th of the following month,
 * Dhaka time. Returned as the exclusive end (00:00 on the 11th); a fee still unpaid
 * at that instant is overdue.
 */
export function dueAt(key: string): Date {
  return new Date(monthEnd(key).getTime() + 10 * DAY_MS);
}

/** Charging starts with January 2027 (December 2026 is the free launch month). */
export const billingStart = () => monthStart(BILLING_START_MONTH);

/**
 * The part of `key` a store is billed for: from the later of the month start, the
 * store's creation and the start of billing, to the month end. Null when none of
 * the month is billable (before billing starts, or before the store existed).
 */
export function billingPeriod(
  storeCreatedAt: Date,
  key: string,
): { start: Date; end: Date } | null {
  const start = new Date(
    Math.max(monthStart(key).getTime(), storeCreatedAt.getTime(), billingStart().getTime()),
  );
  const end = monthEnd(key);
  return start < end ? { start, end } : null;
}

export const money = (n: number) => Math.round(n * 100) / 100;
export const feeFor = (sales: number) => money((sales * PLATFORM_FEE_PERCENT) / 100);

/**
 * A store's fee-eligible sales in [start, end): delivered orders only (pending,
 * in-progress and cancelled orders never count), dated by delivery, product
 * subtotal only (delivery charges excluded), minus any refunded amount. Each order
 * is one document, so it can't be counted twice.
 */
export async function eligibleSales(
  storeId: string,
  start: Date,
  end: Date,
  session?: ClientSession,
): Promise<{ sales: number; orders: number }> {
  const [row] = await col
    .orders()
    .aggregate<{ sales: number; orders: number }>(
      [
        { $match: { store_id: storeId, status: "delivered" } },
        // Orders delivered before `delivered_at` existed fall back to their last update.
        { $addFields: { at: { $ifNull: ["$delivered_at", "$updated_at"] } } },
        { $match: { at: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: null,
            sales: {
              $sum: {
                $max: [0, { $subtract: ["$subtotal", { $ifNull: ["$refunded_amount", 0] }] }],
              },
            },
            orders: { $sum: 1 },
          },
        },
      ],
      { session },
    )
    .toArray();
  return { sales: money(row?.sales ?? 0), orders: row?.orders ?? 0 };
}

// ---- Notifications & audit ------------------------------------------------------------

export async function notifySeller(
  userId: string,
  kind: string,
  title: string,
  body: string,
  session?: ClientSession,
) {
  await col.notifications().insertOne(
    {
      _id: newId(),
      user_id: userId,
      audience: "seller",
      kind,
      title,
      body,
      order_id: null,
      read_at: null,
      created_at: new Date(),
    },
    { session },
  );
}

export async function audit(
  entry: Omit<PaymentAuditDoc, "_id" | "created_at">,
  session?: ClientSession,
) {
  await col
    .paymentAudit()
    .insertOne({ _id: newId(), ...entry, created_at: new Date() }, { session });
}

const monthLabel = (key: string) =>
  monthStart(key).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
const dayLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
/** The deadline as people say it: "10 Feb 2027" (the last day to pay). */
export const deadlineLabel = (key: string) => dayLabel(new Date(dueAt(key).getTime() - 1));
export { monthLabel };

// ---- Invoices -------------------------------------------------------------------------

/** Generate (once) the invoice of one store for one closed month. Returns it if new. */
async function invoiceStoreMonth(store: StoreDoc, key: string): Promise<PlatformInvoiceDoc | null> {
  const period = billingPeriod(store.created_at, key);
  if (!period) return null;
  const { sales, orders } = await eligibleSales(store._id, period.start, period.end);
  const fee = feeFor(sales);
  // Stores that never opened (pending/rejected) and sold nothing get no invoice at all.
  if (fee === 0 && (store.status === "pending" || store.status === "rejected")) return null;
  const now = new Date();
  const doc: PlatformInvoiceDoc = {
    _id: newId(),
    store_id: store._id,
    seller_id: store.seller_id,
    seller_user_id: store.user_id,
    billing_month: key,
    period_start: period.start,
    period_end: period.end,
    eligible_sales: sales,
    order_count: orders,
    commission_percent: PLATFORM_FEE_PERCENT,
    fee,
    due_at: dueAt(key),
    status: fee > 0 ? "pending" : "not_due",
    overdue: false,
    paid_amount: null,
    paid_at: null,
    payment_submission_id: null,
    verified_by: null,
    created_at: now,
    updated_at: now,
  };
  try {
    const r = await col
      .invoices()
      .updateOne(
        { store_id: store._id, billing_month: key },
        { $setOnInsert: doc },
        { upsert: true },
      );
    if (!r.upsertedCount) return null; // already invoiced (another run got there first)
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return null; // concurrent upsert
    throw err;
  }
  if (fee > 0) {
    await notifySeller(
      store.user_id,
      "platform_fee",
      `Platform fee for ${monthLabel(key)}`,
      `৳${fee} (5% of ৳${sales} sales). Please pay by ${deadlineLabel(key)} from Payments in your seller dashboard.`,
    );
  }
  return doc;
}

/**
 * Invoice every closed month from January 2027 up to last month (Dhaka). A month
 * that has been completed is skipped via its `billing_runs` marker.
 */
export async function generateInvoices(now = new Date()): Promise<number> {
  const lastClosed = addMonths(monthKeyOf(now), -1);
  let created = 0;
  for (let key = BILLING_START_MONTH; key <= lastClosed; key = addMonths(key, 1)) {
    const marker = `invoices:${key}`;
    if (await col.billingRuns().findOne({ _id: marker })) continue;
    const stores = await col
      .stores()
      .find({ created_at: { $lt: monthEnd(key) } })
      .toArray();
    for (const store of stores) if (await invoiceStoreMonth(store, key)) created += 1;
    try {
      await col.billingRuns().insertOne({ _id: marker, created_at: new Date() });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  return created;
}

// ---- Overdue fees ---------------------------------------------------------------------

const UNPAID: InvoiceStatus[] = ["pending", "submitted", "rejected"];

/**
 * After the 10th: mark unpaid invoices overdue and unpublish their store (only a
 * store that is currently approved). The store keeps everything — products, orders,
 * dashboard access — and comes back automatically once its overdue fees are paid.
 */
export async function markOverdue(now = new Date()): Promise<number> {
  const due = await col
    .invoices()
    .find({ status: { $in: UNPAID }, fee: { $gt: 0 }, due_at: { $lte: now }, overdue: false })
    .toArray();
  let marked = 0;
  for (const inv of due) {
    const r = await col
      .invoices()
      .updateOne(
        { _id: inv._id, overdue: false, status: { $in: UNPAID } },
        { $set: { overdue: true, updated_at: now } },
      );
    if (!r.modifiedCount) continue;
    marked += 1;
    const suspended = await col.stores().findOneAndUpdate(
      { _id: inv.store_id, status: "approved" },
      {
        $set: {
          status: "suspended",
          fee_suspension: {
            previous_status: "approved",
            invoice_ids: [inv._id],
            suspended_at: now,
          },
          updated_at: now,
        },
      },
    );
    if (suspended) {
      await audit({
        actor_id: "system",
        store_id: inv.store_id,
        target_type: "store",
        target_id: inv.store_id,
        action: "auto_suspend_unpaid_fee",
        previous_status: "approved",
        new_status: "suspended",
        note: `Platform fee for ${inv.billing_month} unpaid after the deadline`,
      });
    } else {
      // Already unpublished for another overdue fee: remember this one too.
      await col
        .stores()
        .updateOne(
          { _id: inv.store_id, fee_suspension: { $type: "object" } },
          { $addToSet: { "fee_suspension.invoice_ids": inv._id } },
        );
    }
    await notifySeller(
      inv.seller_user_id,
      "platform_fee_overdue",
      "Platform fee overdue — store unpublished",
      `Your ৳${inv.fee} platform fee for ${monthLabel(inv.billing_month)} was not paid by ${deadlineLabel(inv.billing_month)}. Your store is hidden until it is paid. You can still pay from Payments in your seller dashboard.`,
    );
  }
  return marked;
}

/**
 * Re-publish a store that was unpublished only for unpaid fees, once none of its
 * overdue invoices is still unpaid. A store an admin changed by hand in the
 * meantime has no `fee_suspension` any more and is left alone.
 */
export async function restoreIfSettled(
  storeId: string,
  actorId: string,
  session?: ClientSession,
): Promise<boolean> {
  const store = await col.stores().findOne({ _id: storeId }, { session });
  if (!store?.fee_suspension || store.status !== "suspended") return false;
  const outstanding = await col
    .invoices()
    .countDocuments({ store_id: storeId, overdue: true, status: { $in: UNPAID } }, { session });
  if (outstanding > 0) return false;
  const previous = store.fee_suspension.previous_status;
  const r = await col
    .stores()
    .updateOne(
      { _id: storeId, status: "suspended", fee_suspension: { $type: "object" } },
      { $set: { status: previous, updated_at: new Date() }, $unset: { fee_suspension: "" } },
      { session },
    );
  if (!r.modifiedCount) return false;
  await audit(
    {
      actor_id: actorId,
      store_id: storeId,
      target_type: "store",
      target_id: storeId,
      action: "auto_republish_fee_paid",
      previous_status: "suspended",
      new_status: previous,
      note: "Overdue platform fees settled",
    },
    session,
  );
  await notifySeller(
    store.user_id,
    "platform_fee_paid",
    "Store published again",
    "Thanks — your overdue platform fee is confirmed and your store is visible again.",
    session,
  );
  return true;
}

// ---- Promotions -----------------------------------------------------------------------

/** End promotions whose time is up (featuring already stops at expires_at on reads). */
export async function expirePromotions(now = new Date()): Promise<number> {
  const ending = await col
    .promotions()
    .find({ status: "active", expires_at: { $lte: now } })
    .toArray();
  let expired = 0;
  for (const p of ending) {
    const r = await col
      .promotions()
      .updateOne(
        { _id: p._id, status: "active" },
        { $set: { status: "expired" satisfies PromotionStatus, updated_at: now } },
      );
    if (!r.modifiedCount) continue;
    expired += 1;
    await notifySeller(
      p.seller_user_id,
      "promotion_expired",
      `${p.package_name} ended`,
      "Your featured promotion has ended; your store and products are back in their normal places.",
    );
  }
  return expired;
}

/**
 * When an approved promotion starts: now, or when the store's last approved
 * promotion ends, so a new purchase never shortens or overlaps an existing one.
 */
export async function nextPromotionStart(
  storeId: string,
  now: Date,
  session?: ClientSession,
): Promise<Date> {
  const last = await col
    .promotions()
    .find({ store_id: storeId, status: "active", expires_at: { $gt: now } }, { session })
    .sort({ expires_at: -1 })
    .limit(1)
    .toArray();
  const end = last[0]?.expires_at;
  return end && end > now ? end : now;
}

/** Products and stores featured right now through paid promotions, per marketplace. */
export async function activePromotions(university: string, now = new Date()) {
  const list = await col
    .promotions()
    .find(
      {
        university_slug: university,
        status: "active",
        starts_at: { $lte: now },
        expires_at: { $gt: now },
      },
      { projection: { store_id: 1, product_ids: 1 } },
    )
    .toArray();
  const storeIds = new Set(list.map((p) => p.store_id));
  // A product counts only for the store that bought the promotion.
  const productKeys = new Set(
    list.flatMap((p) => p.product_ids.map((id) => `${p.store_id}:${id}`)),
  );
  return { storeIds, productKeys };
}

// ---- Sweep ----------------------------------------------------------------------------

let lastSweep = 0;
const SWEEP_EVERY_MS = 5 * 60_000;

/**
 * Invoices for closed months, overdue suspensions, expired promotions. Run daily by
 * the cron; payment pages also call it (at most every few minutes per instance) so
 * nothing waits for the next cron if it was delayed.
 */
export async function runBillingSweep(now = new Date(), opts: { force?: boolean } = {}) {
  if (!opts.force && Date.now() - lastSweep < SWEEP_EVERY_MS) return null;
  lastSweep = Date.now();
  const invoices = await generateInvoices(now);
  const overdue = await markOverdue(now);
  const expired = await expirePromotions(now);
  return { invoices, overdue, expired };
}

/** Test helper: allow the next sweep to run immediately. */
export const resetSweepThrottle = () => (lastSweep = 0);

// ---- API shapes -----------------------------------------------------------------------

export function displayStatus(inv: PlatformInvoiceDoc, now = new Date()): PaymentDisplayStatus {
  switch (inv.status) {
    case "paid":
    case "waived":
    case "not_due":
    case "submitted":
    case "rejected":
      return inv.status;
    case "pending":
      return inv.overdue || inv.due_at <= now ? "overdue" : "pending";
  }
}

export function invoiceToApi(inv: PlatformInvoiceDoc, now = new Date()): PlatformInvoice {
  return {
    id: inv._id,
    store_id: inv.store_id,
    billing_month: inv.billing_month,
    period_start: inv.period_start.toISOString(),
    period_end: inv.period_end.toISOString(),
    eligible_sales: inv.eligible_sales,
    order_count: inv.order_count,
    commission_percent: inv.commission_percent,
    fee: inv.fee,
    due_at: inv.due_at.toISOString(),
    status: inv.status,
    display_status: displayStatus(inv, now),
    // overdue = unpaid AND past the deadline (a paid or waived fee is never "overdue")
    overdue: UNPAID.includes(inv.status) && inv.fee > 0 && (inv.overdue || inv.due_at <= now),
    paid_amount: inv.paid_amount,
    paid_at: inv.paid_at?.toISOString() ?? null,
    payment_submission_id: inv.payment_submission_id,
    created_at: inv.created_at.toISOString(),
  };
}

export function promotionToApi(
  p: PromotionDoc,
  names: Map<string, string>,
  now = new Date(),
): SellerPromotion {
  let live: SellerPromotion["live_state"] = "not_started";
  if (p.status === "expired") live = "ended";
  else if (p.status === "active" && p.starts_at && p.expires_at) {
    live = p.expires_at <= now ? "ended" : p.starts_at > now ? "scheduled" : "live";
  }
  return {
    id: p._id,
    package_id: p.package_id,
    package_name: p.package_name,
    price: p.price,
    duration_days: p.duration_days,
    duration_hours: p.duration_hours,
    product_ids: p.product_ids,
    products: p.product_ids.map((id) => ({ id, name: names.get(id) ?? "Removed product" })),
    status: p.status === "active" && live === "ended" ? "expired" : p.status,
    live_state: live,
    starts_at: p.starts_at?.toISOString() ?? null,
    expires_at: p.expires_at?.toISOString() ?? null,
    created_at: p.created_at.toISOString(),
  };
}
