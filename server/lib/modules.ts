import type { Request } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import type { PublicOwner } from "../../shared/types";
import { isUniversitySlug } from "../../shared/universities";
import { assertOwnImageUrl } from "./cloudinary";
import { col } from "./db";
import { forbidden, loadSession, notFound, type SessionUser } from "./http";

/** The signed-in user if there is one; public pages work without logging in. */
export async function optionalUser(req: Request): Promise<SessionUser | null> {
  if (req.user) return req.user;
  const user = await loadSession(req).catch(() => null);
  if (user) req.user = user;
  return user;
}

const userKey = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : id);

/** Public names for a set of user ids (name and join date only, never contact details). */
export async function publicOwners(ids: string[]): Promise<Map<string, PublicOwner>> {
  const unique = [...new Set(ids)];
  const docs = await col
    .users()
    .find({ _id: { $in: unique.map(userKey) } } as never, {
      projection: { name: 1, createdAt: 1 },
    })
    .toArray();
  const map = new Map<string, PublicOwner>();
  for (const d of docs) {
    const id = String(d["_id"]);
    map.set(id, {
      id,
      name: String(d["name"] ?? "").trim() || "CampusCart student",
      member_since: d["createdAt"] instanceof Date ? d["createdAt"].toISOString() : null,
    });
  }
  for (const id of unique)
    if (!map.has(id)) map.set(id, { id, name: "CampusCart student", member_since: null });
  return map;
}

/**
 * Hide internal user ids from everyone except the owner: the public sees a name only.
 * Returns the masked `owner_id` and `owner` fields to spread into an API object.
 */
export function ownerFields(
  ownerId: string,
  owners: Map<string, PublicOwner>,
  viewerId: string | undefined,
) {
  const owner = owners.get(ownerId)!;
  const mine = viewerId === ownerId;
  return {
    owner_id: mine ? ownerId : "",
    owner: { ...owner, id: mine ? owner.id : "" },
    is_owner: mine,
  };
}

export async function isAdmin(userId: string): Promise<boolean> {
  const doc = await col.users().findOne({ _id: userKey(userId) } as never, {
    projection: { role: 1 },
  });
  return doc?.["role"] === "admin";
}

/** Literal text match: user input never becomes a regular expression. */
export const textMatch = (q: string) =>
  new RegExp(
    q
      .trim()
      .slice(0, 80)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i",
  );

export const universityField = z
  .string()
  .refine((s) => isUniversitySlug(s), "Select a valid university");

/** Image URLs must be our Cloudinary uploads inside the user's own folder. */
export const ownImages = (kind: "preowned" | "basha", userId: string, urls: string[]) =>
  urls.map((u) => assertOwnImageUrl(u, kind, userId));

export const money = z.number().min(0).max(10_000_000);
export const optionalMoney = money.nullable().optional();

/** "YYYY-MM-DD" from a date input, stored as UTC midnight. */
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .transform((s) => new Date(`${s}T00:00:00.000Z`))
  .refine((d) => !Number.isNaN(d.getTime()), "Use a valid date");

export const phoneOptional = z
  .string()
  .trim()
  .max(20)
  .regex(/^[+\d\s-]*$/, "Phone number can contain only digits, spaces, + and -")
  .nullable()
  .optional();

/** Owner-only access to a document; admins may read but the API never lets them edit content fields. */
export function assertOwner(doc: { owner_id: string } | null, userId: string, what = "Item") {
  if (!doc) throw notFound(`${what} not found`);
  if (doc.owner_id !== userId)
    throw forbidden(`You can only change your own ${what.toLowerCase()}`);
}

export const sortParam = (v: unknown, allowed: readonly string[], fallback: string) =>
  typeof v === "string" && allowed.includes(v) ? v : fallback;

export const numParam = (v: unknown): number | undefined => {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export const strParam = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined;
