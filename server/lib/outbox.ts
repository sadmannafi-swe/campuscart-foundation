import { renderSellerOrderEmail } from "../../shared/email/orderEmail";
import { universityBySlug } from "../../shared/universities";
import { col } from "./db";
import { getGmailConfig, sendGmail } from "./gmail";
import { siteUrl } from "./mailer";

const MAX_ATTEMPTS = 5;
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

export interface OutboxResult {
  configured: boolean;
  sent: number;
  failed: number;
}

/** Send queued seller order e-mails (optionally only for some orders). */
export async function processEmailOutbox(
  opts: { orderIds?: string[]; limit?: number } = {},
): Promise<OutboxResult> {
  const config = getGmailConfig();
  if (!config) return { configured: false, sent: 0, failed: 0 };

  const outbox = col.emailOutbox();
  // Release jobs left "sending" by a crashed invocation.
  await outbox.updateMany(
    { status: "sending", locked_at: { $lt: new Date(Date.now() - 10 * 60 * 1000) } },
    { $set: { status: "pending", locked_at: null } },
  );

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < (opts.limit ?? 20); i++) {
    const job = await outbox.findOneAndUpdate(
      {
        status: "pending",
        created_at: { $gt: new Date(Date.now() - MAX_AGE_MS) },
        ...(opts.orderIds ? { order_id: { $in: opts.orderIds } } : {}),
      },
      { $set: { status: "sending", locked_at: new Date() }, $inc: { attempts: 1 } },
      { sort: { created_at: 1 }, returnDocument: "after" },
    );
    if (!job) break;
    try {
      const order = await col.orders().findOne({ _id: job.order_id });
      if (!order) throw new Error("Order not found");
      const store = await col
        .stores()
        .findOne({ _id: order.store_id }, { projection: { name: 1 } });
      const email = renderSellerOrderEmail({
        orderId: order._id,
        createdAt: order.created_at.toISOString(),
        storeName: store?.name ?? "your store",
        universityName: universityBySlug(order.university_slug)?.name ?? order.university_slug,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        deliveryAddress: order.delivery_address,
        note: order.note,
        total: order.total,
        items: order.items,
        dashboardUrl: `${siteUrl()}/sell/dashboard/orders?order=${order._id}`,
      });
      await sendGmail(config, job.to_email, email);
      await outbox.updateOne(
        { _id: job._id },
        { $set: { status: "sent", sent_at: new Date(), last_error: null, locked_at: null } },
      );
      sent += 1;
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
      console.error(`[email_outbox] ${job._id}: ${message}`);
      await outbox.updateOne(
        { _id: job._id },
        {
          $set: {
            status: job.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
            last_error: message,
            locked_at: null,
          },
        },
      );
      failed += 1;
    }
  }
  return { configured: true, sent, failed };
}
