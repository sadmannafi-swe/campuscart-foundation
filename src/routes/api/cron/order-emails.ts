import { createFileRoute } from "@tanstack/react-router";

/**
 * Retry sweep for queued seller order e-mails (the normal path sends them
 * immediately from checkout; this catches anything that failed).
 *
 * Vercel Cron (vercel.json) calls GET with `Authorization: Bearer $CRON_SECRET`.
 * Any other scheduler can POST with the same header.
 */
async function handle(request: Request): Promise<Response> {
  const secrets = [process.env["CRON_SECRET"], process.env["LOVABLE_CRON_SECRET"]].filter(
    (s): s is string => typeof s === "string" && s.length >= 16,
  );
  if (secrets.length === 0) return new Response("Cron secret not configured", { status: 500 });

  const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return new Response("Unauthorized", { status: 401 });

  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
  const provided = digest(token);
  if (!secrets.some((s) => timingSafeEqual(provided, digest(s)))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { processEmailOutbox, resolveSiteUrl } = await import("@/lib/email/outbox.server");
  try {
    const result = await processEmailOutbox({ limit: 50, siteUrl: resolveSiteUrl(request.url) });
    return Response.json(result);
  } catch (error) {
    console.error("[cron/order-emails]", error);
    return Response.json({ error: "Outbox processing failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/cron/order-emails")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
