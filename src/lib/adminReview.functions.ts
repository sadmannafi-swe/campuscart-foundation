import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";

export interface AdminApplication {
  store: Tables<"stores">;
  seller: Tables<"sellers"> | null;
  studentId: string | null;
  studentIdImageUrl: string | null;
  logoUrl: string | null;
  universityName: string | null;
}

/** Unauthenticated review console data (secret-path admin area). */
export const listApplications = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminApplication[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: stores, error } = await supabaseAdmin
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const list = stores ?? [];
    if (list.length === 0) return [];

    const sellerIds = [...new Set(list.map((s) => s.seller_id))];
    const { data: sellers } = await supabaseAdmin.from("sellers").select("*").in("id", sellerIds);
    const { data: ids } = await supabaseAdmin
      .from("seller_identity")
      .select("seller_id, student_id, student_id_image_path")
      .in("seller_id", sellerIds);
    const { data: unis } = await supabaseAdmin.from("universities").select("slug, name");

    const sign = async (path: string | null | undefined) => {
      if (!path) return null;
      const { data } = await supabaseAdmin.storage
        .from("seller-media")
        .createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    };

    return Promise.all(
      list.map(async (store) => {
        const identity = ids?.find((i) => i.seller_id === store.seller_id);
        return {
          store,
          seller: sellers?.find((s) => s.id === store.seller_id) ?? null,
          studentId: identity?.student_id ?? null,
          studentIdImageUrl: await sign(identity?.student_id_image_path),
          logoUrl: await sign(store.logo_path),
          universityName: unis?.find((u) => u.slug === store.university_slug)?.name ?? null,
        };
      }),
    );
  },
);

const updateSchema = z.object({
  storeId: z.string().uuid(),
  sellerId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "suspended"]),
  reason: z.string().trim().max(300).nullable().optional(),
});

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("stores")
      .update({
        status: data.status,
        rejection_reason: data.status === "rejected" ? (data.reason ?? null) : null,
        approved_at: data.status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", data.storeId);
    if (error) throw error;

    const { error: sellerError } = await supabaseAdmin
      .from("sellers")
      .update({ status: data.status })
      .eq("id", data.sellerId);
    if (sellerError) throw sellerError;

    return { ok: true as const };
  });

export interface StoreOrderSummary {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  /** Product subtotal of delivered orders only — shipping excluded. */
  deliveredSales: number;
}

export interface AdminOrder {
  order: Tables<"orders">;
  items: Tables<"order_items">[];
}

/** All orders (buyer, seller, store, product, university, amounts) plus per-store summary. */
export const listOrderData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const orders: AdminOrder[] = (data ?? []).map(({ order_items, ...order }) => ({
    order,
    items: order_items ?? [],
  }));
  const summaries: Record<string, StoreOrderSummary> = {};
  for (const { order } of orders) {
    const s = (summaries[order.store_id] ??= {
      total: 0, pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, deliveredSales: 0,
    });
    s.total += 1;
    s[order.status] += 1;
    if (order.status === "delivered") s.deliveredSales += Number(order.subtotal);
  }
  return { orders, summaries };
});
