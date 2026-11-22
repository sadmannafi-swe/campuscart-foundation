// Server-only: drains the email_outbox queue that the database fills when an
// order is placed (trigger orders_queue_seller_email).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getGmailConfig, sendGmail } from "@/lib/email/gmail.server";
import { renderSellerOrderEmail } from "@/lib/email/orderEmail";

const MAX_ATTEMPTS = 5;

export interface OutboxResult {
  configured: boolean;
  sent: number;
  failed: number;
}

/** Public base URL used for links inside e-mails. SITE_URL wins over the request origin. */
export function resolveSiteUrl(requestUrl?: string): string | null {
  const configured = process.env["SITE_URL"]?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (!requestUrl) return null;
  try {
    return new URL(requestUrl).origin;
  } catch {
    return null;
  }
}

export async function processEmailOutbox(opts: {
  orderIds?: string[];
  limit?: number;
  siteUrl: string | null;
}): Promise<OutboxResult> {
  const config = getGmailConfig();
  // Leave rows queued until Gmail is configured, so nothing is lost.
  if (!config) return { configured: false, sent: 0, failed: 0 };

  const { data: jobs, error } = await supabaseAdmin.rpc("claim_email_outbox", {
    _limit: opts.limit ?? 20,
    ...(opts.orderIds ? { _order_ids: opts.orderIds } : {}),
  });
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const job of jobs ?? []) {
    try {
      if (job.kind !== "seller_new_order" || !job.order_id)
        throw new Error(`Unknown e-mail kind: ${job.kind}`);

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*, order_items(*), stores(name), universities(name)")
        .eq("id", job.order_id)
        .single();
      if (orderError) throw orderError;

      const email = renderSellerOrderEmail({
        orderId: order.id,
        createdAt: order.created_at,
        storeName: order.stores?.name ?? "your store",
        universityName: order.universities?.name ?? order.university_slug,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        deliveryAddress: order.delivery_address,
        note: order.note,
        total: order.total,
        items: order.order_items ?? [],
        dashboardUrl: opts.siteUrl
          ? `${opts.siteUrl}/sell/dashboard/orders?order=${order.id}`
          : null,
      });

      await sendGmail(config, job.to_email, email);
      await supabaseAdmin
        .from("email_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
          locked_at: null,
        })
        .eq("id", job.id);
      sent += 1;
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
      console.error(`[email_outbox] ${job.id}: ${message}`);
      await supabaseAdmin
        .from("email_outbox")
        .update({
          status: job.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          last_error: message,
          locked_at: null,
        })
        .eq("id", job.id);
      failed += 1;
    }
  }
  return { configured: true, sent, failed };
}
