import { oneLine, type RenderedEmail } from "./orderEmail";

/** Minimal RFC 5322 / MIME builder for Gmail's `messages.send` raw format. */

const utf8Base64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

/** RFC 2047 encoded-word, so non-ASCII (e.g. ৳) is safe in headers. */
export function encodeHeader(value: string): string {
  const clean = oneLine(value);
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${utf8Base64(clean)}?=`;
}

const wrap76 = (b64: string) => b64.replace(/.{1,76}/g, "$&\r\n").trimEnd();

export function isValidEmail(value: string): boolean {
  return /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(value);
}

export function buildMimeMessage(opts: {
  from: string;
  fromName: string;
  to: string;
  email: RenderedEmail;
  boundary?: string;
}): string {
  if (!isValidEmail(opts.to)) throw new Error(`Invalid recipient address: ${opts.to}`);
  if (!isValidEmail(opts.from)) throw new Error(`Invalid sender address: ${opts.from}`);
  const boundary =
    opts.boundary ?? `cc_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return [
    `From: ${encodeHeader(opts.fromName)} <${opts.from}>`,
    `To: <${opts.to}>`,
    `Subject: ${encodeHeader(opts.email.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(utf8Base64(opts.email.text)),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(utf8Base64(opts.email.html)),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export const toBase64Url = (value: string) =>
  Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
