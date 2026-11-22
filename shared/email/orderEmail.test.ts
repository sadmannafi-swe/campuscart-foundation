import { describe, expect, it } from "vitest";
import { escapeHtml, renderSellerOrderEmail, type OrderEmailInput } from "./orderEmail";
import { buildMimeMessage, encodeHeader, isValidEmail, toBase64Url } from "./mime";

const input: OrderEmailInput = {
  orderId: "d6349d19-0000-4000-8000-000000000000",
  createdAt: "2026-11-22T10:15:00Z",
  storeName: "Store <A>",
  universityName: "Daffodil International University",
  customerName: "Rahim <script>alert(1)</script>",
  customerPhone: "01700000000",
  deliveryAddress: "Hall 3, Room 12",
  note: "Call me\r\nBcc: evil@x.com",
  total: "1000.00",
  items: [{ product_name: "Calculator", quantity: 2, unit_price: "500.00", line_total: "1000.00" }],
  dashboardUrl: "https://campuscart.example/sell/dashboard/orders?order=d6349d19",
};

const decodeParts = (mime: string) =>
  [...mime.matchAll(/base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n--/g)].map((m) =>
    Buffer.from(m[1]!.replace(/\r\n/g, ""), "base64").toString("utf8"),
  );

describe("seller order e-mail", () => {
  it("includes the full order details", () => {
    const email = renderSellerOrderEmail(input);
    expect(email.subject).toBe("New order #D6349D19 · ৳1,000 · 2 items — Store <A>");
    expect(email.text).toContain("Calculator × 2 @ ৳500 = ৳1,000");
    expect(email.text).toContain("Phone: 01700000000");
    expect(email.text).toContain("Deliver to: Hall 3, Room 12");
    expect(email.html).toContain(input.dashboardUrl!.replace(/&/g, "&amp;"));
  });

  it("escapes buyer-controlled text in HTML", () => {
    const { html } = renderSellerOrderEmail(input);
    expect(html).not.toContain("<script>");
    expect(html).toContain("Rahim &lt;script&gt;");
    expect(html).toContain("Store &lt;A&gt;");
    expect(escapeHtml(`"'&`)).toBe("&quot;&#39;&amp;");
  });

  it("omits the dashboard button when no site URL is known", () => {
    const { html, text } = renderSellerOrderEmail({ ...input, dashboardUrl: null });
    expect(html).not.toContain("Open order in dashboard");
    expect(text).not.toContain("Open order:");
  });
});

describe("MIME builder", () => {
  it("encodes non-ASCII headers and cannot be header-injected", () => {
    expect(encodeHeader("Hello")).toBe("Hello");
    expect(encodeHeader("৳ order")).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
    const mime = buildMimeMessage({
      from: "shop@gmail.com",
      fromName: "CampusCart",
      to: "seller@gmail.com",
      email: { subject: "Line1\r\nBcc: evil@x.com", html: "<b>hi</b>", text: "hi ৳" },
      boundary: "B",
    });
    const headers = mime.split("\r\n\r\n")[0]!;
    expect(headers.split("\r\n").filter((l) => /^bcc:/i.test(l))).toHaveLength(0);
    expect(headers).toContain("To: <seller@gmail.com>");
    expect(decodeParts(mime)).toEqual(["hi ৳", "<b>hi</b>"]);
  });

  it("rejects malformed recipients", () => {
    expect(isValidEmail("seller@gmail.com")).toBe(true);
    expect(isValidEmail("bad address@gmail.com")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(() =>
      buildMimeMessage({
        from: "shop@gmail.com",
        fromName: "x",
        to: "x>@y.com\r\nBcc:z",
        email: { subject: "", html: "", text: "" },
      }),
    ).toThrow();
  });

  it("produces URL-safe base64 for the Gmail API", () => {
    expect(toBase64Url("??>>")).not.toMatch(/[+/=]/);
  });
});
