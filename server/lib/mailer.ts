import type { RenderedEmail } from "../../shared/email/orderEmail";
import { getGmailConfig, sendGmail } from "./gmail";

export const isMailConfigured = () => getGmailConfig() !== null;

/** Sends through Gmail when configured; otherwise logs and returns false. */
export async function sendMail(to: string, email: RenderedEmail): Promise<boolean> {
  const config = getGmailConfig();
  if (!config) {
    console.warn(`[mail] Gmail not configured — not sent: "${email.subject}"`);
    return false;
  }
  await sendGmail(config, to, email);
  return true;
}

/**
 * Public base URL for links in e-mails and auth callbacks.
 * Vercel previews use their own URL, so previews never send production links.
 */
export function siteUrl(fallback?: string): string {
  const env = process.env;
  if (env["VERCEL_ENV"] === "preview") {
    const host = env["VERCEL_BRANCH_URL"] || env["VERCEL_URL"];
    if (host) return `https://${host}`;
  }
  const configured = env["SITE_URL"]?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (env["VERCEL_PROJECT_PRODUCTION_URL"])
    return `https://${env["VERCEL_PROJECT_PRODUCTION_URL"]}`;
  return fallback ?? "http://localhost:5173";
}
