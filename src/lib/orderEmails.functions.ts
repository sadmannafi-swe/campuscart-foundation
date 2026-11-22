import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Called by checkout right after place_order succeeds, so sellers get their
 * Gmail notification within seconds. Only the caller's own orders are processed;
 * anything that fails stays queued for the cron sweep (/api/cron/order-emails).
 */
export const dispatchOrderEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ orderIds: z.array(z.string().uuid()).min(1).max(20) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: own, error } = await context.supabase
      .from("orders")
      .select("id")
      .eq("buyer_id", context.userId)
      .in("id", data.orderIds);
    if (error) throw error;
    const orderIds = (own ?? []).map((o) => o.id);
    if (orderIds.length === 0) return { configured: true, sent: 0, failed: 0 };

    const { processEmailOutbox, resolveSiteUrl } = await import("@/lib/email/outbox.server");
    return processEmailOutbox({ orderIds, siteUrl: resolveSiteUrl(getRequest()?.url) });
  });
