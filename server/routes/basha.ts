import { Router } from "express";
import { z } from "zod";
import {
  BASHA_FACILITY_KEYS,
  BASHA_TYPES,
  type BashaFacilities,
  type BashaListing,
  type BashaRoommate,
} from "../../shared/types";
import { col, toApi, type BashaDoc } from "../lib/db";
import {
  badRequest,
  marketplaceParam,
  me,
  newId,
  notFound,
  parse,
  requireUser,
  type SessionUser,
} from "../lib/http";
import {
  assertOwner,
  dateOnly,
  isAdmin,
  money,
  numParam,
  optionalUser,
  ownerFields,
  ownImages,
  publicOwners,
  sortParam,
  strParam,
  textMatch,
  universityField,
} from "../lib/modules";

/** BashaLagbe: rooms, roommates and apartments near campus. */
export const bashaRouter = Router();

const MAP_HOSTS = ["google.com", "www.google.com", "maps.google.com", "goo.gl", "maps.app.goo.gl"];

const mapUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && MAP_HOSTS.includes(u.hostname);
    } catch {
      return false;
    }
  }, "Paste a Google Maps link (https://maps.google.com/… or https://maps.app.goo.gl/…)");

const facilitiesSchema = z.object({
  attached_bathroom: z.boolean(),
  bathroom_type: z.enum(["private", "shared"]).nullable().optional(),
  balcony: z.boolean(),
  kitchen: z.boolean(),
  kitchen_type: z.enum(["private", "shared"]).nullable().optional(),
  furnished: z.boolean(),
  electricity: z.boolean(),
  water: z.boolean(),
  wifi: z.boolean(),
  gas: z.boolean(),
  other: z.string().trim().max(300).default(""),
  rules: z.string().trim().max(600).default(""),
});

const roommateSchema = z.object({
  available_seats: z.number().int().min(1).max(20),
  current_roommates: z.number().int().min(0).max(20),
  preferred_type: z.string().trim().max(80).default(""),
  gender_preference: z.string().trim().max(40).default(""),
  department_preference: z.string().trim().max(80).default(""),
  requirements: z.string().trim().max(400).default(""),
});

const listingSchema = z.object({
  university_slug: universityField,
  title: z.string().trim().min(5).max(120),
  type: z.enum(BASHA_TYPES),
  rent: money,
  advance: money.nullable().optional(),
  available_from: dateOnly,
  area: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(200),
  address_public: z.boolean().default(false),
  map_url: mapUrl.nullable().optional().or(z.literal("")),
  images: z.array(z.string().url()).min(1, "Add at least one photo").max(10),
  description: z.string().trim().min(20).max(3000),
  facilities: facilitiesSchema,
  roommate: roommateSchema.nullable().optional(),
});

/** Drop answers that don't apply: bathroom/kitchen type only when present, roommate only for rooms. */
function normalize(
  type: BashaDoc["type"],
  facilities: z.infer<typeof facilitiesSchema>,
  roommate: z.infer<typeof roommateSchema> | null | undefined,
): { facilities: BashaFacilities; roommate: BashaRoommate | null } {
  if (facilities.attached_bathroom && !facilities.bathroom_type)
    throw badRequest("Choose whether the bathroom is private or shared.");
  if (facilities.kitchen && !facilities.kitchen_type)
    throw badRequest("Choose whether the kitchen is private or shared.");
  const fixed: BashaFacilities = {
    ...facilities,
    bathroom_type: facilities.attached_bathroom ? (facilities.bathroom_type ?? null) : null,
    kitchen_type: facilities.kitchen ? (facilities.kitchen_type ?? null) : null,
  };
  if (type === "apartment") return { facilities: fixed, roommate: null };
  if (type === "shared_room" && !roommate)
    throw badRequest("Add the roommate details: available seats and current roommates.");
  return { facilities: fixed, roommate: roommate ?? null };
}

async function bashaToApi(docs: BashaDoc[], viewer: SessionUser | null): Promise<BashaListing[]> {
  const owners = await publicOwners(docs.map((d) => d.owner_id));
  const admin = viewer ? await isAdmin(viewer.id) : false;
  return docs.map((d) => {
    const fields = ownerFields(d.owner_id, owners, viewer?.id);
    const showAddress = d.address_public || fields.is_owner || admin;
    return {
      ...toApi(d),
      address: showAddress ? d.address : null,
      map_url: showAddress ? d.map_url : null,
      ...fields,
    } as BashaListing;
  });
}

const sorts = {
  newest: { created_at: -1 },
  rent_asc: { rent: 1, created_at: -1 },
  rent_desc: { rent: -1, created_at: -1 },
} as const;

bashaRouter.get("/basha", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const filter: Record<string, unknown> = { university_slug: university, moderation: "visible" };
  const status = req.query["status"];
  if (status === "rented" || status === "unavailable") filter["status"] = status;
  else if (status !== "all") filter["status"] = "available";
  const type = strParam(req.query["type"]);
  if (type && (BASHA_TYPES as readonly string[]).includes(type)) filter["type"] = type;
  const q = strParam(req.query["q"]);
  if (q)
    filter["$or"] = [
      { title: textMatch(q) },
      { area: textMatch(q) },
      { description: textMatch(q) },
    ];
  const min = numParam(req.query["min"]);
  const max = numParam(req.query["max"]);
  if (min !== undefined || max !== undefined)
    filter["rent"] = {
      ...(min !== undefined && { $gte: min }),
      ...(max !== undefined && { $lte: max }),
    };
  const by = strParam(req.query["available_by"]);
  if (by && /^\d{4}-\d{2}-\d{2}$/.test(by))
    filter["available_from"] = { $lte: new Date(`${by}T00:00:00.000Z`) };
  const wanted = (strParam(req.query["facilities"]) ?? "")
    .split(",")
    .filter((f): f is (typeof BASHA_FACILITY_KEYS)[number] =>
      (BASHA_FACILITY_KEYS as readonly string[]).includes(f),
    );
  for (const f of wanted) filter[`facilities.${f}`] = true;
  const sort = sortParam(req.query["sort"], Object.keys(sorts), "newest") as keyof typeof sorts;
  const docs = await col.basha().find(filter).sort(sorts[sort]).limit(300).toArray();
  res.json(await bashaToApi(docs, await optionalUser(req)));
});

bashaRouter.get("/basha/mine", requireUser, async (req, res) => {
  const u = me(req);
  const docs = await col.basha().find({ owner_id: u.id }).sort({ created_at: -1 }).toArray();
  res.json(await bashaToApi(docs, u));
});

bashaRouter.get("/basha/:id", async (req, res) => {
  const viewer = await optionalUser(req);
  const doc = await col.basha().findOne({ _id: req.params["id"] });
  const canSeeHidden =
    !!viewer && !!doc && (doc.owner_id === viewer.id || (await isAdmin(viewer.id)));
  if (!doc || (doc.moderation !== "visible" && !canSeeHidden)) throw notFound("Listing not found");
  res.json((await bashaToApi([doc], viewer))[0]);
});

bashaRouter.post("/basha", requireUser, async (req, res) => {
  const u = me(req);
  const body = parse(listingSchema, req.body);
  const { facilities, roommate } = normalize(body.type, body.facilities, body.roommate);
  const now = new Date();
  const doc: BashaDoc = {
    _id: newId(),
    owner_id: u.id,
    university_slug: body.university_slug,
    title: body.title,
    type: body.type,
    rent: body.rent,
    advance: body.advance ?? null,
    available_from: body.available_from,
    area: body.area,
    address: body.address,
    address_public: body.address_public,
    map_url: body.map_url || null,
    images: ownImages("basha", u.id, body.images),
    description: body.description,
    facilities,
    roommate,
    status: "available",
    moderation: "visible",
    created_at: now,
    updated_at: now,
  };
  await col.basha().insertOne(doc);
  res.status(201).json((await bashaToApi([doc], u))[0]);
});

bashaRouter.patch("/basha/:id", requireUser, async (req, res) => {
  const u = me(req);
  const doc = await col.basha().findOne({ _id: req.params["id"] });
  assertOwner(doc, u.id, "Listing");
  const body = parse(listingSchema.partial(), req.body);
  const set: Record<string, unknown> = { updated_at: new Date() };
  for (const key of [
    "university_slug",
    "title",
    "type",
    "rent",
    "available_from",
    "area",
    "address",
    "address_public",
    "description",
  ] as const) {
    if (body[key] !== undefined) set[key] = body[key];
  }
  if (body.advance !== undefined) set["advance"] = body.advance;
  if (body.map_url !== undefined) set["map_url"] = body.map_url || null;
  if (body.images !== undefined) set["images"] = ownImages("basha", u.id, body.images);
  if (body.type !== undefined || body.facilities !== undefined || body.roommate !== undefined) {
    const n = normalize(
      body.type ?? doc!.type,
      body.facilities ?? { ...doc!.facilities },
      body.roommate === undefined ? doc!.roommate : body.roommate,
    );
    set["facilities"] = n.facilities;
    set["roommate"] = n.roommate;
  }
  await col.basha().updateOne({ _id: doc!._id, owner_id: u.id }, { $set: set });
  res.json({ ok: true });
});

bashaRouter.patch("/basha/:id/status", requireUser, async (req, res) => {
  const u = me(req);
  const { status } = parse(
    z.object({ status: z.enum(["available", "rented", "unavailable"]) }),
    req.body,
  );
  const doc = await col.basha().findOne({ _id: req.params["id"] });
  assertOwner(doc, u.id, "Listing");
  await col
    .basha()
    .updateOne({ _id: doc!._id, owner_id: u.id }, { $set: { status, updated_at: new Date() } });
  res.json({ ok: true });
});

bashaRouter.delete("/basha/:id", requireUser, async (req, res) => {
  const u = me(req);
  const doc = await col.basha().findOne({ _id: req.params["id"] });
  assertOwner(doc, u.id, "Listing");
  await col.basha().deleteOne({ _id: doc!._id, owner_id: u.id });
  res.json({ ok: true });
});
