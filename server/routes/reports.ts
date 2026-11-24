import { Router } from "express";
import { z } from "zod";
import { REPORT_REASONS, REPORT_TARGETS } from "../../shared/types";
import { col } from "../lib/db";
import { badRequest, HttpError, me, newId, notFound, parse, requireUser } from "../lib/http";
import { getTarget } from "../lib/targets";

/** Anyone signed in can flag a module record for the admins; reports are admin-only to read. */
export const reportsRouter = Router();

reportsRouter.post("/reports", requireUser, async (req, res) => {
  const u = me(req);
  const body = parse(
    z.object({
      target_type: z.enum(REPORT_TARGETS),
      target_id: z.string().uuid(),
      reason: z.enum(REPORT_REASONS),
      details: z.string().trim().max(1000).default(""),
    }),
    req.body,
  );
  const target = await getTarget(body.target_type, body.target_id);
  if (!target || target.moderation !== "visible")
    throw notFound("This item is no longer available");
  if (target.owner_id === u.id) throw badRequest("You can't report your own post");
  try {
    await col.reports().insertOne({
      _id: newId(),
      target_type: body.target_type,
      target_id: body.target_id,
      reporter_id: u.id,
      reason: body.reason,
      details: body.details,
      status: "open",
      reviewed_at: null,
      created_at: new Date(),
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      throw new HttpError(409, "You've already reported this. Our team will review it.");
    throw err;
  }
  res.status(201).json({ ok: true });
});
