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

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({
      error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input",
    });
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
