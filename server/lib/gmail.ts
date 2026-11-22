// Sends mail through the Gmail API over HTTPS (works on serverless runtimes).
//
// Required environment variables (Vercel → Project → Settings → Environment Variables):
//   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN  — OAuth client with scope
//                                                              https://www.googleapis.com/auth/gmail.send
//   GMAIL_SENDER       — the Gmail address that authorised the refresh token
//   GMAIL_SENDER_NAME  — optional display name (default "CampusCart")
import { buildMimeMessage, toBase64Url } from "../../shared/email/mime";
import type { RenderedEmail } from "../../shared/email/orderEmail";

interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sender: string;
  senderName: string;
}

export function getGmailConfig(): GmailConfig | null {
  const clientId = process.env["GMAIL_CLIENT_ID"]?.trim();
  const clientSecret = process.env["GMAIL_CLIENT_SECRET"]?.trim();
  const refreshToken = process.env["GMAIL_REFRESH_TOKEN"]?.trim();
  const sender = process.env["GMAIL_SENDER"]?.trim();
  if (!clientId || !clientSecret || !refreshToken || !sender) return null;
  return {
    clientId,
    clientSecret,
    refreshToken,
    sender,
    senderName: process.env["GMAIL_SENDER_NAME"]?.trim() || "CampusCart",
  };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(config: GmailConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(
      `Gmail auth failed: ${body.error ?? res.status} ${body.error_description ?? ""}`.trim(),
    );
  }
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return body.access_token;
}

export async function sendGmail(
  config: GmailConfig,
  to: string,
  email: RenderedEmail,
): Promise<string> {
  const raw = toBase64Url(
    buildMimeMessage({ from: config.sender, fromName: config.senderName, to, email }),
  );
  const token = await getAccessToken(config);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (res.status === 401) cachedToken = null;
  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!res.ok)
    throw new Error(`Gmail send failed (${res.status}): ${body.error?.message ?? "unknown error"}`);
  return body.id ?? "";
}
