import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { col, toApi, type ConversationDoc } from "../lib/db";
import {
  badRequest,
  forbidden,
  HttpError,
  marketplaceParam,
  me,
  newId,
  notFound,
  parse,
  requireUser,
} from "../lib/http";

export const chatRouter = Router();
chatRouter.use(requireUser);

async function participantConversation(id: string, userId: string): Promise<ConversationDoc> {
  const c = await col.conversations().findOne({ _id: id });
  if (!c) throw notFound("Conversation not found");
  if (c.buyer_id !== userId && c.seller_user_id !== userId)
    throw forbidden("You are not part of this conversation");
  return c;
}

/** Open (or reuse) the buyer's conversation about a product. */
chatRouter.post("/chat/open", async (req, res) => {
  const u = me(req);
  const { product_id, university } = parse(
    z.object({ product_id: z.string().uuid(), university: z.string() }),
    req.body,
  );
  const marketplace = marketplaceParam(university);
  const product = await col
    .products()
    .findOne({ _id: product_id, is_active: true, university_slug: marketplace });
  const store = product
    ? await col.stores().findOne({ _id: product.store_id, status: "approved" })
    : null;
  if (!product || !store) throw badRequest("This product is no longer available");
  if (store.user_id === u.id) throw badRequest("You cannot chat about your own product");

  const existing = await col.conversations().findOne({ buyer_id: u.id, product_id });
  if (existing) return res.json({ id: existing._id });

  const userDoc = await col
    .users()
    .findOne({ _id: ObjectId.isValid(u.id) ? new ObjectId(u.id) : u.id } as never, {
      projection: { name: 1 },
    });
  const doc: ConversationDoc = {
    _id: newId(),
    product_id,
    store_id: store._id,
    seller_user_id: store.user_id,
    buyer_id: u.id,
    university_slug: product.university_slug,
    product_name: product.name,
    product_price: product.price,
    product_image: product.images[0] ?? null,
    buyer_name: String(userDoc?.["name"] ?? "").trim() || "CampusCart buyer",
    first_message_at: null,
    last_message_at: null,
    last_message_preview: "",
    created_at: new Date(),
  };
  try {
    await col.conversations().insertOne(doc);
    return res.status(201).json({ id: doc._id });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      const again = await col.conversations().findOne({ buyer_id: u.id, product_id });
      if (again) return res.json({ id: again._id });
    }
    throw err;
  }
});

chatRouter.get("/chat/conversations", async (req, res) => {
  const u = me(req);
  const role = req.query["role"] === "seller" ? "seller" : "buyer";
  const filter =
    role === "seller"
      ? { seller_user_id: u.id, first_message_at: { $ne: null } }
      : { buyer_id: u.id };
  const list = await col
    .conversations()
    .find(filter)
    .sort({ last_message_at: -1, created_at: -1 })
    .limit(200)
    .toArray();
  res.json(list.map((c) => toApi(c)));
});

chatRouter.get("/chat/conversations/:id", async (req, res) => {
  const c = await participantConversation(req.params["id"]!, me(req).id);
  res.json(toApi(c));
});

chatRouter.get("/chat/conversations/:id/messages", async (req, res) => {
  const c = await participantConversation(req.params["id"]!, me(req).id);
  const list = await col
    .messages()
    .find({ conversation_id: c._id })
    .sort({ created_at: 1 })
    .limit(500)
    .toArray();
  res.json(list.map((m) => toApi(m)));
});

chatRouter.post("/chat/conversations/:id/messages", async (req, res) => {
  const u = me(req);
  const { body } = parse(
    z.object({ body: z.string().trim().min(1, "Message cannot be empty").max(1000) }),
    req.body,
  );
  const c = await participantConversation(req.params["id"]!, u.id);
  const role = c.buyer_id === u.id ? "buyer" : "seller";
  if (role === "seller" && !c.first_message_at) {
    throw new HttpError(409, "Sellers can only reply after the buyer sends the first message");
  }
  const now = new Date();
  const id = newId();
  await col.messages().insertOne({
    _id: id,
    conversation_id: c._id,
    sender_id: u.id,
    sender_role: role,
    body,
    read_at: null,
    created_at: now,
  });
  await col.conversations().updateOne(
    { _id: c._id },
    {
      $set: {
        last_message_at: now,
        last_message_preview: body.slice(0, 120),
        first_message_at: c.first_message_at ?? now,
      },
    },
  );
  res.status(201).json({ id });
});

chatRouter.post("/chat/conversations/:id/read", async (req, res) => {
  const u = me(req);
  const c = await participantConversation(req.params["id"]!, u.id);
  await col
    .messages()
    .updateMany(
      { conversation_id: c._id, read_at: null, sender_id: { $ne: u.id } },
      { $set: { read_at: new Date() } },
    );
  res.json({ ok: true });
});

/** Unread message counts per conversation for the current user. */
chatRouter.get("/chat/unread", async (req, res) => {
  const u = me(req);
  const convs = await col
    .conversations()
    .find({ $or: [{ buyer_id: u.id }, { seller_user_id: u.id }] }, { projection: { _id: 1 } })
    .toArray();
  const rows = await col
    .messages()
    .aggregate<{ _id: string; n: number }>([
      {
        $match: {
          conversation_id: { $in: convs.map((c) => c._id) },
          read_at: null,
          sender_id: { $ne: u.id },
        },
      },
      { $group: { _id: "$conversation_id", n: { $sum: 1 } } },
    ])
    .toArray();
  res.json(Object.fromEntries(rows.map((r) => [r._id, r.n])));
});
