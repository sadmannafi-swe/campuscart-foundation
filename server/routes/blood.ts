import { Router } from "express";
import { z } from "zod";
import { BLOOD_GROUPS, type BloodRequest, type DonorProfile } from "../../shared/types";
import { col, toApi, type BloodRequestDoc, type DonorProfileDoc } from "../lib/db";
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
  optionalUser,
  ownerFields,
  phoneOptional,
  publicOwners,
  sortParam,
  strParam,
  textMatch,
  universityField,
} from "../lib/modules";

/**
 * Blood Donation: requests for blood and a register of willing donors. Contact goes
 * through CampusCart messages; a phone number is shown only when its owner chose
 * to share it.
 */
export const bloodRouter = Router();

const contact = {
  contact_preference: z.enum(["messages", "phone"]),
  contact_phone: phoneOptional,
};

/** A shared number must be given when "phone" is chosen, and is dropped otherwise. */
function contactValue(pref: "messages" | "phone", phone: string | null | undefined) {
  if (pref === "phone") {
    if (!phone || phone.replace(/\D/g, "").length < 6)
      throw badRequest("Add the phone number you want to share, or choose CampusCart messages.");
    return phone;
  }
  return null;
}

// ---- Requests ----------------------------------------------------------------

const requestSchema = z.object({
  university_slug: universityField,
  patient_name: z.string().trim().max(80).nullable().optional(),
  blood_group: z.enum(BLOOD_GROUPS),
  hospital_name: z.string().trim().min(2).max(120),
  hospital_location: z.string().trim().min(2).max(160),
  needed_on: dateOnly,
  donors_needed: z.number().int().min(1).max(20),
  description: z.string().trim().max(1000).default(""),
  ...contact,
});

async function requestsToApi(docs: BloodRequestDoc[], viewer: SessionUser | null) {
  const owners = await publicOwners(docs.map((d) => d.owner_id));
  return docs.map(
    (d) =>
      ({
        ...toApi(d),
        patient_name: d.patient_name || null,
        contact_phone: d.contact_preference === "phone" ? d.contact_phone : null,
        ...ownerFields(d.owner_id, owners, viewer?.id),
      }) as BloodRequest,
  );
}

bloodRouter.get("/blood/requests", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const filter: Record<string, unknown> = { university_slug: university, moderation: "visible" };
  const status = req.query["status"];
  if (status === "fulfilled" || status === "cancelled") filter["status"] = status;
  else if (status !== "all") filter["status"] = "active";
  const group = strParam(req.query["blood_group"]);
  if (group && (BLOOD_GROUPS as readonly string[]).includes(group)) filter["blood_group"] = group;
  const location = strParam(req.query["location"]);
  if (location)
    filter["$or"] = [
      { hospital_location: textMatch(location) },
      { hospital_name: textMatch(location) },
    ];
  const q = strParam(req.query["q"]);
  if (q)
    filter["$and"] = [
      {
        $or: [
          { hospital_name: textMatch(q) },
          { hospital_location: textMatch(q) },
          { description: textMatch(q) },
        ],
      },
    ];
  const sort: Record<string, 1 | -1> =
    sortParam(req.query["sort"], ["newest", "needed_soon"], "newest") === "needed_soon"
      ? { needed_on: 1, created_at: -1 }
      : { created_at: -1 };
  const docs = await col.bloodRequests().find(filter).sort(sort).limit(300).toArray();
  res.json(await requestsToApi(docs, await optionalUser(req)));
});

bloodRouter.get("/blood/requests/mine", requireUser, async (req, res) => {
  const u = me(req);
  const docs = await col
    .bloodRequests()
    .find({ owner_id: u.id })
    .sort({ created_at: -1 })
    .toArray();
  res.json(await requestsToApi(docs, u));
});

bloodRouter.get("/blood/requests/:id", async (req, res) => {
  const viewer = await optionalUser(req);
  const doc = await col.bloodRequests().findOne({ _id: req.params["id"] });
  const canSeeHidden =
    !!viewer && !!doc && (doc.owner_id === viewer.id || (await isAdmin(viewer.id)));
  if (!doc || (doc.moderation !== "visible" && !canSeeHidden)) throw notFound("Request not found");
  res.json((await requestsToApi([doc], viewer))[0]);
});

bloodRouter.post("/blood/requests", requireUser, async (req, res) => {
  const u = me(req);
  const body = parse(requestSchema, req.body);
  const now = new Date();
  const doc: BloodRequestDoc = {
    _id: newId(),
    owner_id: u.id,
    university_slug: body.university_slug,
    patient_name: body.patient_name || null,
    blood_group: body.blood_group,
    hospital_name: body.hospital_name,
    hospital_location: body.hospital_location,
    needed_on: body.needed_on,
    donors_needed: body.donors_needed,
    contact_preference: body.contact_preference,
    contact_phone: contactValue(body.contact_preference, body.contact_phone),
    description: body.description,
    status: "active",
    moderation: "visible",
    created_at: now,
    updated_at: now,
  };
  await col.bloodRequests().insertOne(doc);
  res.status(201).json((await requestsToApi([doc], u))[0]);
});

bloodRouter.patch("/blood/requests/:id", requireUser, async (req, res) => {
  const u = me(req);
  const doc = await col.bloodRequests().findOne({ _id: req.params["id"] });
  assertOwner(doc, u.id, "Request");
  const body = parse(requestSchema.partial(), req.body);
  const set: Record<string, unknown> = { updated_at: new Date() };
  for (const key of [
    "university_slug",
    "blood_group",
    "hospital_name",
    "hospital_location",
    "needed_on",
    "donors_needed",
    "description",
  ] as const) {
    if (body[key] !== undefined) set[key] = body[key];
  }
  if (body.patient_name !== undefined) set["patient_name"] = body.patient_name || null;
  if (body.contact_preference !== undefined || body.contact_phone !== undefined) {
    const pref = body.contact_preference ?? doc!.contact_preference;
    set["contact_preference"] = pref;
    set["contact_phone"] = contactValue(pref, body.contact_phone ?? doc!.contact_phone);
  }
  await col.bloodRequests().updateOne({ _id: doc!._id, owner_id: u.id }, { $set: set });
  res.json({ ok: true });
});

bloodRouter.patch("/blood/requests/:id/status", requireUser, async (req, res) => {
  const u = me(req);
  const { status } = parse(
    z.object({ status: z.enum(["active", "fulfilled", "cancelled"]) }),
    req.body,
  );
  const doc = await col.bloodRequests().findOne({ _id: req.params["id"] });
  assertOwner(doc, u.id, "Request");
  await col
    .bloodRequests()
    .updateOne({ _id: doc!._id, owner_id: u.id }, { $set: { status, updated_at: new Date() } });
  res.json({ ok: true });
});

bloodRouter.delete("/blood/requests/:id", requireUser, async (req, res) => {
  const u = me(req);
  const doc = await col.bloodRequests().findOne({ _id: req.params["id"] });
  assertOwner(doc, u.id, "Request");
  await col.bloodRequests().deleteOne({ _id: doc!._id, owner_id: u.id });
  res.json({ ok: true });
});

// ---- Donor profiles -------------------------------------------------------------

const donorSchema = z.object({
  university_slug: universityField,
  name: z.string().trim().min(2).max(80),
  blood_group: z.enum(BLOOD_GROUPS),
  department: z.string().trim().max(60).default(""),
  batch: z.string().trim().max(20).default(""),
  location: z.string().trim().min(2).max(80),
  availability: z.enum(["available", "unavailable"]).default("available"),
  ...contact,
});

function donorToApi(d: DonorProfileDoc, viewer: SessionUser | null): DonorProfile {
  const mine = viewer?.id === d.owner_id;
  return {
    ...toApi(d),
    owner_id: mine ? d.owner_id : "",
    contact_phone: d.contact_preference === "phone" ? d.contact_phone : null,
    is_owner: mine,
  } as DonorProfile;
}

bloodRouter.get("/blood/donors", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const filter: Record<string, unknown> = { university_slug: university, moderation: "visible" };
  if (req.query["availability"] !== "all") filter["availability"] = "available";
  const group = strParam(req.query["blood_group"]);
  if (group && (BLOOD_GROUPS as readonly string[]).includes(group)) filter["blood_group"] = group;
  const location = strParam(req.query["location"]);
  if (location) filter["location"] = textMatch(location);
  const q = strParam(req.query["q"]);
  if (q)
    filter["$or"] = [
      { name: textMatch(q) },
      { location: textMatch(q) },
      { department: textMatch(q) },
    ];
  const viewer = await optionalUser(req);
  const docs = await col.donors().find(filter).sort({ updated_at: -1 }).limit(300).toArray();
  res.json(docs.map((d) => donorToApi(d, viewer)));
});

bloodRouter.get("/blood/donors/me", requireUser, async (req, res) => {
  const u = me(req);
  const doc = await col.donors().findOne({ owner_id: u.id });
  res.json(doc ? donorToApi(doc, u) : null);
});

bloodRouter.get("/blood/donors/:id", async (req, res) => {
  const viewer = await optionalUser(req);
  const doc = await col.donors().findOne({ _id: req.params["id"] });
  const canSeeHidden =
    !!viewer && !!doc && (doc.owner_id === viewer.id || (await isAdmin(viewer.id)));
  if (!doc || (doc.moderation !== "visible" && !canSeeHidden)) throw notFound("Donor not found");
  res.json(donorToApi(doc, viewer));
});

/** Create or update the signed-in user's own donor profile (one per user). */
bloodRouter.put("/blood/donors/me", requireUser, async (req, res) => {
  const u = me(req);
  const body = parse(donorSchema, req.body);
  const now = new Date();
  const fields = {
    university_slug: body.university_slug,
    name: body.name,
    blood_group: body.blood_group,
    department: body.department,
    batch: body.batch,
    location: body.location,
    availability: body.availability,
    contact_preference: body.contact_preference,
    contact_phone: contactValue(body.contact_preference, body.contact_phone),
    updated_at: now,
  };
  await col.donors().updateOne(
    { owner_id: u.id },
    {
      $set: fields,
      $setOnInsert: { _id: newId(), owner_id: u.id, moderation: "visible", created_at: now },
    },
    { upsert: true },
  );
  const doc = await col.donors().findOne({ owner_id: u.id });
  res.json(donorToApi(doc!, u));
});

bloodRouter.patch("/blood/donors/me/availability", requireUser, async (req, res) => {
  const u = me(req);
  const { availability } = parse(
    z.object({ availability: z.enum(["available", "unavailable"]) }),
    req.body,
  );
  const r = await col
    .donors()
    .updateOne({ owner_id: u.id }, { $set: { availability, updated_at: new Date() } });
  if (r.matchedCount === 0) throw notFound("You don't have a donor profile yet");
  res.json({ ok: true });
});

bloodRouter.delete("/blood/donors/me", requireUser, async (req, res) => {
  await col.donors().deleteOne({ owner_id: me(req).id });
  res.json({ ok: true });
});
