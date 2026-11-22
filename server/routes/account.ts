import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import type { Profile, UploadKind } from "../../shared/types";
import { assertOwnImageUrl, signUpload } from "../lib/cloudinary";
import { col, toApi } from "../lib/db";
import { me, parse, requireUser } from "../lib/http";

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
    avatar_path: (doc?.["image"] as string) || null,
    role: String(doc?.["role"] ?? "user"),
    student_id: (doc?.["studentId"] as string) || null,
  };
  res.json(profile);
});

const profilePatch = z.object({
  full_name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  department: z.string().trim().max(60).optional(),
  batch: z.string().trim().max(20).optional(),
  avatar_url: z.string().url().nullable().optional(),
});

accountRouter.patch("/me", async (req, res) => {
  const u = me(req);
  const body = parse(profilePatch, req.body);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (body.full_name !== undefined) set["name"] = body.full_name;
  if (body.phone !== undefined) set["phone"] = body.phone;
  if (body.department !== undefined) set["department"] = body.department;
  if (body.batch !== undefined) set["batch"] = body.batch;
  if (body.avatar_url !== undefined) {
    set["image"] =
      body.avatar_url === null ? null : assertOwnImageUrl(body.avatar_url, "avatar", u.id);
  }
  await col.users().updateOne({ _id: userKey(u.id) } as never, { $set: set });
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
    z.object({ kind: z.enum(["product", "store-logo", "avatar", "student-id"]) }),
    req.body,
  );
  res.json(signUpload(kind as UploadKind, me(req).id));
});

accountRouter.get("/notifications", async (req, res) => {
  const list = await col
    .notifications()
    .find({ user_id: me(req).id })
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();
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
