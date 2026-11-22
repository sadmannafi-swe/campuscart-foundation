import { formatPrice } from "@/lib/format";

/** Pure e-mail rendering — no I/O, so it is unit-testable and safe to share. */

export interface OrderEmailItem {
  product_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
}

export interface OrderEmailInput {
  orderId: string;
  createdAt: string;
  storeName: string;
  universityName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  note: string;
  total: number | string;
  items: OrderEmailItem[];
  /** Absolute link to the order in the seller dashboard. */
  dashboardUrl: string | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export const shortRef = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip CR/LF so user text can never inject e-mail headers. */
export function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function formatDhakaTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function renderSellerOrderEmail(input: OrderEmailInput): RenderedEmail {
  const ref = shortRef(input.orderId);
  const total = formatPrice(Number(input.total));
  const placed = formatDhakaTime(input.createdAt);
  const itemCount = input.items.reduce((n, i) => n + Number(i.quantity), 0);
  const subject = oneLine(
    `New order ${ref} · ${total} · ${itemCount} item${itemCount === 1 ? "" : "s"} — ${input.storeName}`,
  );

  const e = escapeHtml;
  const rows = input.items
    .map(
      (i) => `<tr>
  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb">${e(i.product_name)}</td>
  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:center">${Number(i.quantity)}</td>
  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${e(formatPrice(Number(i.unit_price)))}</td>
  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${e(formatPrice(Number(i.line_total)))}</td>
</tr>`,
    )
    .join("\n");

  const detail = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top;white-space:nowrap">${e(label)}</td><td style="padding:4px 0;font-weight:600">${e(value)}</td></tr>`;

  const html = `<!doctype html>
<html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="background:#ffffff;border-radius:12px;padding:24px">
    <p style="margin:0;color:#16a34a;font-size:13px;font-weight:700;letter-spacing:.04em">NEW ORDER</p>
    <h1 style="margin:6px 0 4px;font-size:22px">${e(ref)} · ${e(total)}</h1>
    <p style="margin:0;color:#6b7280;font-size:14px">${e(input.storeName)} · ${e(input.universityName)} · ${e(placed)}</p>

    <h2 style="margin:24px 0 8px;font-size:15px">Items</h2>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr style="color:#6b7280;font-size:12px;text-align:left">
        <th style="padding-bottom:6px">Product</th><th style="padding-bottom:6px;text-align:center">Qty</th>
        <th style="padding-bottom:6px;text-align:right">Price</th><th style="padding-bottom:6px;text-align:right">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:12px 0 0;text-align:right;font-size:16px;font-weight:700">Order total: ${e(total)}</p>

    <h2 style="margin:24px 0 8px;font-size:15px">Buyer &amp; delivery</h2>
    <table role="presentation" style="border-collapse:collapse;font-size:14px">
      ${detail("Name", input.customerName)}
      ${detail("Phone", input.customerPhone)}
      ${detail("Deliver to", input.deliveryAddress)}
      ${input.note ? detail("Note", input.note) : ""}
      ${detail("Payment", "Cash on delivery / pickup")}
    </table>

    ${
      input.dashboardUrl
        ? `<p style="margin:28px 0 0"><a href="${e(input.dashboardUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Open order in dashboard</a></p>`
        : ""
    }
    <p style="margin:24px 0 0;color:#6b7280;font-size:12px">Please confirm the order with the buyer and update its status in your CampusCart seller dashboard.</p>
  </div>
  <p style="margin:16px 0 0;text-align:center;color:#9ca3af;font-size:12px">CampusCart — Your Campus. Your Marketplace.<br>You can turn off order e-mails in Seller Dashboard → Settings.</p>
</div>
</body></html>`;

  const text = [
    `New order ${ref} for ${input.storeName}`,
    `Placed: ${placed}`,
    "",
    "Items:",
    ...input.items.map(
      (i) =>
        `- ${i.product_name} × ${Number(i.quantity)} @ ${formatPrice(Number(i.unit_price))} = ${formatPrice(Number(i.line_total))}`,
    ),
    "",
    `Order total: ${total}`,
    "",
    `Buyer: ${input.customerName}`,
    `Phone: ${input.customerPhone}`,
    `Deliver to: ${input.deliveryAddress}`,
    ...(input.note ? [`Note: ${input.note}`] : []),
    "Payment: Cash on delivery / pickup",
    "",
    ...(input.dashboardUrl ? [`Open order: ${input.dashboardUrl}`, ""] : []),
    "You can turn off order e-mails in Seller Dashboard → Settings.",
  ].join("\n");

  return { subject, html, text };
}
