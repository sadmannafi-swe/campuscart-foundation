import { Router } from "express";
import { z } from "zod";
import type { Order } from "../../shared/types";
import { col, getClient, toApi, type OrderDoc, type OrderItemDoc } from "../lib/db";
import {
  badRequest,
  HttpError,
  marketplaceParam,
  me,
  newId,
  parse,
  requireUser,
} from "../lib/http";
import { notifyNewOrder, notifyStatusChange } from "../lib/notify";
import { processEmailOutbox } from "../lib/outbox";

export const ordersRouter = Router();
ordersRouter.use(requireUser);

export function orderToApi(o: OrderDoc): Order {
  const { items, ...rest } = o;
  const api = toApi(rest);
  return {
    ...api,
    order_items: items.map((i) => ({ ...i, order_id: o._id, created_at: api.created_at })),
  } as Order;
}

const placeSchema = z.object({
  items: z
    .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(99) }))
    .min(1, "No items to order")
    .max(50, "Too many items in one order"),
  name: z.string().trim().min(2, "Please fill in your name").max(80),
  phone: z.string().trim().min(6, "Please fill in your phone number").max(20),
  address: z.string().trim().min(3, "Please fill in your delivery address").max(300),
  note: z.string().trim().max(300).default(""),
  /** The marketplace the buyer is shopping in; every product must belong to it. */
  university: z.string(),
});

/** One order per store; prices always come from the database, never the client. */
ordersRouter.post("/orders", async (req, res) => {
  const buyer = me(req);
  const body = parse(placeSchema, req.body);
  const marketplace = marketplaceParam(body.university);

  const qty = new Map<string, number>();
  for (const i of body.items)
    qty.set(i.product_id, Math.min(99, (qty.get(i.product_id) ?? 0) + i.quantity));

  const session = getClient().startSession();
  const created: OrderDoc[] = [];
  try {
    await session.withTransaction(async () => {
      created.length = 0;
      const products = await col
        .products()
        .find({ _id: { $in: [...qty.keys()] } }, { session })
        .toArray();
      const stores = await col
        .stores()
        .find({ _id: { $in: [...new Set(products.map((p) => p.store_id))] } }, { session })
        .toArray();
      const storeById = new Map(stores.map((s) => [s._id, s]));
      if (
        products.length !== qty.size ||
        products.some(
          (p) => !p.is_active || !p.in_stock || storeById.get(p.store_id)?.status !== "approved",
        )
      ) {
        throw badRequest("One or more products are no longer available");
      }
      if (
        products.some(
          (p) =>
            p.university_slug !== marketplace ||
            storeById.get(p.store_id)?.university_slug !== marketplace,
        )
      ) {
        throw badRequest(
          "Some items belong to another university marketplace and can't be ordered here",
        );
      }
      if (stores.some((s) => s.user_id === buyer.id))
        throw badRequest("You cannot order from your own store");

      const now = new Date();
      for (const store of stores) {
        const items: OrderItemDoc[] = products
          .filter((p) => p.store_id === store._id)
          .map((p) => {
            const quantity = qty.get(p._id)!;
            return {
              id: newId(),
              product_id: p._id,
              product_name: p.name,
              product_image: p.images[0] ?? null,
              unit_price: p.price,
              quantity,
              line_total: Math.round(p.price * quantity * 100) / 100,
            };
          });
        const subtotal = Math.round(items.reduce((n, i) => n + i.line_total, 0) * 100) / 100;
        const order: OrderDoc = {
          _id: newId(),
          buyer_id: buyer.id,
          store_id: store._id,
          seller_id: store.seller_id,
          seller_user_id: store.user_id,
          university_slug: store.university_slug,
          customer_name: body.name,
          customer_phone: body.phone,
          delivery_address: body.address,
          note: body.note,
          subtotal,
          shipping_fee: 0,
          total: subtotal,
          status: "pending",
          items,
          created_at: now,
          updated_at: now,
        };
        await col.orders().insertOne(order, { session });
        await notifyNewOrder(order, session);

        const seller = await col.sellers().findOne({ _id: store.seller_id }, { session });
        const to = (seller?.notification_email || seller?.email || "").trim();
        if (seller?.order_email_enabled && to) {
          await col.emailOutbox().insertOne(
            {
              _id: newId(),
              kind: "seller_new_order",
              order_id: order._id,
              to_email: to,
              status: "pending",
              attempts: 0,
              last_error: null,
              locked_at: null,
              sent_at: null,
              created_at: now,
            },
            { session },
          );
        }
        created.push(order);
      }
    });
  } finally {
    await session.endSession();
  }

  // E-mail sellers right away; anything that fails stays queued for the cron retry.
  const ids = created.map((o) => o._id);
  await Promise.race([
    processEmailOutbox({ orderIds: ids }).catch((err) =>
      console.error("[orders] e-mail dispatch", err),
    ),
    new Promise((r) => setTimeout(r, 8000)),
  ]);
  res.status(201).json({ ids });
});

ordersRouter.get("/orders", async (req, res) => {
  const orders = await col
    .orders()
    .find({ buyer_id: me(req).id })
    .sort({ created_at: -1 })
    .limit(200)
    .toArray();
  res.json(orders.map(orderToApi));
});

ordersRouter.post("/orders/:id/cancel", async (req, res) => {
  const order = await col
    .orders()
    .findOneAndUpdate(
      { _id: req.params["id"], buyer_id: me(req).id, status: "pending" },
      { $set: { status: "cancelled", updated_at: new Date() } },
      { returnDocument: "after" },
    );
  if (!order)
    throw new HttpError(409, "Only pending orders can be cancelled. Please contact the seller.");
  await notifyStatusChange(order, "cancelled");
  res.json(orderToApi(order));
});

const reviewSchema = z.object({
  order_id: z.string().uuid(),
  product_id: z.string().uuid(),
  rating: z
    .number()
    .int()
    .min(1, "Choose a rating from 1 to 5")
    .max(5, "Choose a rating from 1 to 5"),
  comment: z.string().trim().max(1000).default(""),
});

/** Only the buyer of a delivered order can review, once per product per order. */
ordersRouter.post("/reviews", async (req, res) => {
  const buyer = me(req);
  const body = parse(reviewSchema, req.body);
  const order = await col
    .orders()
    .findOne({ _id: body.order_id, buyer_id: buyer.id, status: "delivered" });
  if (!order) throw badRequest("Only your delivered purchases can be reviewed");
  if (!order.items.some((i) => i.product_id === body.product_id))
    throw badRequest("This product is not part of your order");
  const id = newId();
  try {
    await col.reviews().insertOne({
      _id: id,
      order_id: body.order_id,
      product_id: body.product_id,
      buyer_id: buyer.id,
      author_name: buyer.name?.trim() || "CampusCart buyer",
      rating: body.rating,
      comment: body.comment,
      created_at: new Date(),
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(409, "You have already reviewed this product for this order");
    }
    throw err;
  }
  res.status(201).json({ id });
});
