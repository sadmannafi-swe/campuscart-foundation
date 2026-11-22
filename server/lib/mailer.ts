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

/** Public base URL for links in e-mails and auth callbacks. */
export function siteUrl(fallback?: string): string {
  const configured = process.env["SITE_URL"]?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env["VERCEL_PROJECT_PRODUCTION_URL"])
    return `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`;
  return fallback ?? "http://localhost:5173";
}
