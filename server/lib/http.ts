import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { ObjectId } from "mongodb";
import { z, ZodError, type ZodTypeAny } from "zod";
import { getAuth } from "./auth";
import { isUniversitySlug } from "../../shared/universities";
import { col } from "./db";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const notFound = (msg = "Not found") => new HttpError(404, msg);
export const forbidden = (msg = "Forbidden") => new HttpError(403, msg);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role?: string | null;
  image?: string | null;
  phone?: string | null;
  department?: string | null;
  batch?: string | null;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: SessionUser;
  }
}

export async function loadSession(req: Request): Promise<SessionUser | null> {
  // Always validate against the database (not the 5-minute cookie cache), so
  // sign-out elsewhere, password resets and bans take effect immediately.
  const session = await getAuth().api.getSession({
    headers: fromNodeHeaders(req.headers),
    query: { disableCookieCache: true },
  });
  return (session?.user as SessionUser | undefined) ?? null;
}

export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  if (req.user) return next();
  const user = await loadSession(req);
  if (!user) throw new HttpError(401, "Please log in to continue");
  req.user = user;
  next();
}

/** Signed-in user that is the given id's owner — use after requireUser. */
export const me = (req: Request): SessionUser => {
  if (!req.user) throw new HttpError(401, "Please log in to continue");
  return req.user;
};

function adminEmails(): string[] {
  return (process.env["ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Admin = role "admin" in the database. E-mails listed in ADMIN_EMAILS are
 * promoted on first visit, but only once their e-mail address is verified.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = req.user ?? (await loadSession(req));
  if (!user) throw new HttpError(401, "Please log in to continue");
  req.user = user;
  const _id = ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id;
  const record = await col
    .users()
    .findOne({ _id } as never, { projection: { role: 1, email: 1, emailVerified: 1 } });
  if (record?.["role"] === "admin") return next();
  const email = String(record?.["email"] ?? "").toLowerCase();
  if (record?.["emailVerified"] === true && email && adminEmails().includes(email)) {
    await col.users().updateOne({ _id } as never, { $set: { role: "admin" } });
    return next();
  }
  throw forbidden("Admin access only");
}

export function parse<T extends ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  return schema.parse(value);
}

const FIELD_LABELS: Record<string, string> = {
  student_id: "Student ID",
  logo_url: "Logo",
  contact_number: "Contact number",
  original_price: "Original price",
  product_id: "Product",
};

function fieldLabel(path: (string | number)[]): string {
  const key = [...path].reverse().find((p): p is string => typeof p === "string");
  if (!key) return "This field";
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const words = key.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Turn the first validation issue into a sentence a user can act on, e.g.
 * "Description must be at least 10 characters." Messages written explicitly
 * in a schema (`.min(1, "Message cannot be empty")`) are passed through.
 */
export function zodMessage(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Invalid input.";
  const label = fieldLabel(issue.path);
  switch (issue.code) {
    case "too_small":
      if (issue.type === "string") {
        if (!/^String must contain/.test(issue.message)) return issue.message;
        return Number(issue.minimum) <= 1
          ? `${label} is required.`
          : `${label} must be at least ${issue.minimum} characters.`;
      }
      if (issue.type === "number" && /^Number must be/.test(issue.message))
        return `${label} must be at least ${issue.minimum}.`;
      return issue.message;
    case "too_big":
      if (issue.type === "string" && /^String must contain/.test(issue.message))
        return `${label} must be at most ${issue.maximum} characters.`;
      if (issue.type === "number" && /^Number must be/.test(issue.message))
        return `${label} must be at most ${issue.maximum}.`;
      return issue.message;
    case "invalid_type":
      return issue.received === "undefined" || issue.received === "null"
        ? `${label} is required.`
        : `${label} is invalid.`;
    default:
      return /^(Invalid|Required|Expected)/.test(issue.message)
        ? `${label} is invalid.`
        : issue.message;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // An error must never be cached, even if the route had already chosen a CDN cache header.
  if (!res.headersSent) res.set("cache-control", "no-store");
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof ZodError) {
    return res.status(400).json({ error: zodMessage(err) });
  }
  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    (err as { type?: string }).type === "entity.parse.failed"
  ) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  console.error("[api]", err);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
}

export const newId = () => crypto.randomUUID();

/** Every buyer-facing catalogue/checkout request names its university marketplace. */
export function marketplaceParam(value: unknown): string {
  if (typeof value !== "string" || !value) throw badRequest("University marketplace is required");
  if (!isUniversitySlug(value)) throw badRequest("Unknown university marketplace");
  return value;
}
export const uuid = z.string().uuid();

/**
 * Cache-Control for responses that are identical for every visitor (no cookies,
 * no user data). Browsers always revalidate (max-age=0); Vercel's CDN may serve
 * the response for 30 s and keep serving it for up to 60 s more while it fetches a
 * fresh copy in the background. Everything else under /api stays `no-store`.
 *
 * Use it ONLY on GET routes that never read the session, cookies or the
 * Authorization header, and whose output depends on nothing but the URL.
 */
export const PUBLIC_CDN_CACHE = "public, max-age=0, s-maxage=30, stale-while-revalidate=60";
/** Same, for data that only changes with a deploy. */
export const STATIC_CDN_CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
