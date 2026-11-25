import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import type { Profile, UploadKind } from "../../shared/types";
import { assertOwnPrivateId, signedPrivateUrl, signUpload } from "../lib/cloudinary";
import { fromNodeHeaders } from "better-auth/node";
import { getAuth, googleConfig } from "../lib/auth";
import { col, getDb, toApi } from "../lib/db";
import { badRequest, me, parse, requireUser } from "../lib/http";
import { savePersonalDetails } from "../lib/profile";

export const accountRouter = Router();
accountRouter.use(requireUser);

const userKey = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : id);

accountRouter.get("/me", async (req, res) => {
  const u = me(req);
  const doc = await col.users().findOne({ _id: userKey(u.id) } as never);
  const profile: Profile & { student_id: string | null } = {
    id: u.id,
    full_name: String(doc?.["name"] ?? u.name ?? ""),
    email: String(doc?.["email"] ?? u.email),
    phone: String(doc?.["phone"] ?? ""),
    department: (doc?.["department"] as string) || null,
    batch: (doc?.["batch"] as string) || null,
    avatar_path: signedPrivateUrl((doc?.["avatarId"] as string) || null, 400),
    role: String(doc?.["role"] ?? "user"),
    student_id: (doc?.["studentId"] as string) || null,
  };
  res.json(profile);
});

/** How this account can sign in. Google and e-mail/password resolve to the same user. */
async function signInMethods(userId: string) {
  const accounts = await getDb()
    .collection("account")
    .find({ userId: { $in: [userKey(userId), userId] } } as never, {
      projection: { providerId: 1 },
    })
    .toArray();
  const providers = new Set(accounts.map((a) => String(a["providerId"])));
  return {
    password: providers.has("credential"),
    google: providers.has("google"),
    google_available: googleConfig() !== null,
  };
}

accountRouter.get("/me/sign-in-methods", async (req, res) => {
  res.json(await signInMethods(me(req).id));
});

/**
 * Lets someone who signed up with Google add a password, so e-mail + password also
 * logs in to the same account. Only for accounts without one: changing an existing
 * password goes through the password-reset flow, which proves the old one or the inbox.
 */
accountRouter.post("/me/password", async (req, res) => {
  const u = me(req);
  const { new_password } = parse(z.object({ new_password: z.string().min(8).max(128) }), req.body);
  if ((await signInMethods(u.id)).password)
    throw badRequest("This account already has a password. Use “Forgot password” to change it.");
  await getAuth().api.setPassword({
    body: { newPassword: new_password },
    headers: fromNodeHeaders(req.headers),
  });
  res.json(await signInMethods(u.id));
});

const profilePatch = z.object({
  full_name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  department: z.string().trim().max(60).optional(),
  batch: z.string().trim().max(20).optional(),
  avatar_id: z.string().max(300).nullable().optional(),
});

accountRouter.patch("/me", async (req, res) => {
  const u = me(req);
  const body = parse(profilePatch, req.body);
  await savePersonalDetails(u.id, {
    ...body,
    avatar_id:
      body.avatar_id === undefined || body.avatar_id === null
        ? body.avatar_id
        : assertOwnPrivateId(body.avatar_id, u.id, "avatar"),
  });
  res.json({ ok: true });
});

accountRouter.get("/me/reviews", async (req, res) => {
  const reviews = await col
    .reviews()
    .find({ buyer_id: me(req).id })
    .toArray();
  res.json(reviews.map(({ author_name: _a, ...r }) => toApi(r)));
});

accountRouter.post("/uploads/sign", (req, res) => {
  const { kind } = parse(
    z.object({
      kind: z.enum(["product", "store-logo", "avatar", "student-id", "preowned", "basha"]),
    }),
    req.body,
  );
  res.json(signUpload(kind as UploadKind, me(req).id));
});

accountRouter.get("/notifications", async (req, res) => {
  const audience = req.query["audience"];
  const filter: Record<string, unknown> = { user_id: me(req).id };
  if (audience === "buyer" || audience === "seller") filter["audience"] = audience;
  const list = await col.notifications().find(filter).sort({ created_at: -1 }).limit(100).toArray();
  res.json(list.map((n) => toApi(n)));
});

accountRouter.post("/notifications/read", async (req, res) => {
  const { ids } = parse(z.object({ ids: z.array(z.string().uuid()).max(200) }), req.body);
  if (ids.length > 0) {
    await col
      .notifications()
      .updateMany(
        { _id: { $in: ids }, user_id: me(req).id, read_at: null },
        { $set: { read_at: new Date() } },
      );
  }
  res.json({ ok: true });
});
