import type { ClientSession } from "mongodb";
import { col, type OrderDoc } from "./db";
import { newId } from "./http";

const ref = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

async function add(
  userId: string,
  audience: "buyer" | "seller",
  kind: string,
  title: string,
  body: string,
  orderId: string,
  session?: ClientSession,
) {
  await col.notifications().insertOne(
    {
      _id: newId(),
      user_id: userId,
      audience,
      kind,
      title,
      body,
      order_id: orderId,
      read_at: null,
      created_at: new Date(),
    },
    { session },
  );
}

export async function notifyNewOrder(order: OrderDoc, session?: ClientSession) {
  await add(
    order.seller_user_id,
    "seller",
    "new_order",
    "New order received",
    `Order ${ref(order._id)} from ${order.customer_name} · ৳${order.total}`,
    order._id,
    session,
  );
}

export async function notifyStatusChange(order: OrderDoc, status: OrderDoc["status"]) {
  await add(
    order.buyer_id,
    "buyer",
    "order_status",
    "Order status updated",
    `Order ${ref(order._id)} is now ${status}`,
    order._id,
  );
  if (status === "cancelled") {
    await add(
      order.seller_user_id,
      "seller",
      "order_status",
      "Order cancelled",
      `Order ${ref(order._id)} was cancelled`,
      order._id,
    );
  }
}
