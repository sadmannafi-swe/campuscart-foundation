/**
 * End-to-end API tests against a real MongoDB (replica set, for transactions).
 * Run with TEST_MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0 — skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { MongoClient } from "mongodb";

const MONGO = process.env["TEST_MONGODB_URI"];
const ORIGIN = "http://localhost:5173";
const CLOUD = "https://res.cloudinary.com/testcloud/image/upload/v1";

describe.skipIf(!MONGO)("CampusCart API", () => {
  let client: MongoClient;
  let app: import("express").Express;
  const dbName = `cc_test_${Date.now()}`;

  beforeAll(async () => {
    process.env["CLOUDINARY_URL"] = "cloudinary://key:secret@testcloud";
    process.env["ADMIN_EMAILS"] = "admin@diu.edu.bd";
    process.env["CRON_SECRET"] = "cron-secret-for-tests-123";
    delete process.env["GMAIL_CLIENT_ID"];
    process.env["MONGODB_URI"] ??= MONGO;
    client = new MongoClient(MONGO!);
    await client.connect();
    const db = await import("./lib/db");
    db.setDbForTests(client, dbName);
    const { createApp } = await import("./app");
    app = createApp();
  });

  afterAll(async () => {
    await client.db(dbName).dropDatabase();
    await client.close();
  });

  const agent = () => request.agent(app);
  type Agent = ReturnType<typeof agent>;
  const post = (a: Agent, url: string, body?: object) =>
    a
      .post(url)
      .set("origin", ORIGIN)
      .send(body ?? {});
  const patch = (a: Agent, url: string, body: object) =>
    a.patch(url).set("origin", ORIGIN).send(body);

  async function signUp(email: string, name: string, extra: Record<string, string> = {}) {
    const a = agent();
    const r = await post(a, "/api/auth/sign-up/email", {
      email,
      password: "password123",
      name,
      phone: "01700000000",
      ...extra,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    return a;
  }

  async function makeSellerWithStore(
    a: Agent,
    userId: string,
    storeName: string,
    university = "diu",
  ) {
    let r = await post(a, "/api/seller/account", {
      university_slug: university,
      full_name: `${storeName} Owner`,
      phone: "01711111111",
      department: "CSE",
      batch: "Batch 60",
      student_id: "221-15-0001",
      student_id_image: `campuscart/student-id/${userId}/card`,
      email: "spoofed@evil.example", // ignored: the account e-mail is always used
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    r = await post(a, "/api/seller/store", {
      name: storeName,
      description: "Second-hand gadgets for students",
      category: "Electronics",
      contact_number: "01711111111",
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    return r.body.id as string;
  }

  const userIdOf = async (a: Agent) => (await a.get("/api/me")).body.id as string;

  let buyer: Agent, sellerA: Agent, sellerB: Agent, adminAgent: Agent;
  let sellerAId: string, sellerBId: string;
  let storeA: string, storeB: string, productA: string, productB: string;

  it("signs users up and keeps the student ID private", async () => {
    buyer = await signUp("buyer@diu.edu.bd", "Buyer C", {
      studentId: "221-15-9999",
      department: "CSE",
    });
    const session = await buyer.get("/api/auth/get-session");
    expect(session.body.user.email).toBe("buyer@diu.edu.bd");
    expect(session.body.user.studentId).toBeUndefined();
    const meRes = await buyer.get("/api/me");
    expect(meRes.body).toMatchObject({
      full_name: "Buyer C",
      student_id: "221-15-9999",
      role: "user",
    });

    sellerA = await signUp("a@diu.edu.bd", "Seller A");
    sellerB = await signUp("b@diu.edu.bd", "Seller B");
    adminAgent = await signUp("admin@diu.edu.bd", "Admin");
    sellerAId = await userIdOf(sellerA);
    sellerBId = await userIdOf(sellerB);
  });

  it("rejects unauthenticated and cross-site requests", async () => {
    expect((await request(app).get("/api/orders")).status).toBe(401);
    expect((await request(app).get("/api/seller/account")).status).toBe(401);
    const evil = await buyer
      .post("/api/auth/sign-out")
      .set("origin", "https://evil.example")
      .send({});
    expect(evil.status).toBe(403);
  });

  it("onboards sellers; stores start pending and are not public", async () => {
    storeA = await makeSellerWithStore(sellerA, sellerAId, "Store A");
    storeB = await makeSellerWithStore(sellerB, sellerBId, "Store B");
    const acc = await sellerA.get("/api/seller/account");
    expect(acc.body.store.status).toBe("pending");
    expect(acc.body.seller.email).toBe("a@diu.edu.bd");
    expect((await request(app).get(`/api/stores/${storeA}?university=diu`)).status).toBe(404);
    // second store / foreign image rejected
    expect(
      (
        await post(sellerA, "/api/seller/store", {
          name: "x2",
          description: "0123456789",
          category: "Electronics",
          contact_number: "0170000",
        })
      ).status,
    ).toBe(409);
    const badImg = await post(sellerA, "/api/seller/products", {
      name: "Bad",
      category: "x",
      price: 1,
      condition: "new",
      images: [`${CLOUD}/campuscart/product/${sellerBId}/x.jpg`],
    });
    expect(badImg.status).toBe(400);
  });

  it("admin console requires a verified ADMIN_EMAILS account", async () => {
    expect((await buyer.get("/api/admin/applications")).status).toBe(403);
    expect((await adminAgent.get("/api/admin/access")).status).toBe(403); // not verified yet
    await client
      .db(dbName)
      .collection("user")
      .updateOne({ email: "admin@diu.edu.bd" }, { $set: { emailVerified: true } });
    expect((await adminAgent.get("/api/admin/access")).body).toEqual({ isAdmin: true });
    const apps = await adminAgent.get("/api/admin/applications");
    expect(apps.body).toHaveLength(2);
    expect(apps.body[0].studentId).toBe("221-15-0001");
    expect(apps.body[0].studentIdImageUrl).toContain("/authenticated/");
    for (const id of [storeA, storeB]) {
      expect(
        (await post(adminAgent, `/api/admin/stores/${id}/status`, { status: "approved" })).status,
      ).toBe(200);
    }
    expect((await request(app).get(`/api/stores/${storeA}?university=diu`)).body.name).toBe(
      "Store A",
    );
    const dir = (await request(app).get("/api/stores?university=diu")).body;
    expect(dir.map((d: { name: string }) => d.name).sort()).toEqual(["Store A", "Store B"]);
    expect(dir[0]).not.toHaveProperty("user_id");
    expect(dir[0]).not.toHaveProperty("seller_id");
    expect((await request(app).get("/api/stores?university=nsu")).body).toEqual([]);
  });

  it("lets sellers manage only their own listings", async () => {
    let r = await post(sellerA, "/api/seller/products", {
      name: "Calculator",
      category: "Electronics",
      price: 500,
      condition: "like-new",
      images: [`${CLOUD}/campuscart/product/${sellerAId}/calc.jpg`],
    });
    expect(r.status).toBe(201);
    productA = r.body.id;
    r = await post(sellerB, "/api/seller/products", {
      name: "Book",
      category: "Textbooks & Notes",
      price: 250,
      condition: "used",
    });
    productB = r.body.id;
    expect((await patch(sellerB, `/api/seller/products/${productA}`, { price: 1 })).status).toBe(
      404,
    );
    expect(
      (await sellerB.delete(`/api/seller/products/${productA}`).set("origin", ORIGIN)).status,
    ).toBe(404);
    const list = await request(app).get("/api/products?university=diu");
    expect(list.body.map((p: { name: string }) => p.name).sort()).toEqual(["Book", "Calculator"]);
    expect(list.body.find((p: { id: string }) => p.id === productA).store_name).toBe("Store A");
  });

  let orderA: string, orderB: string;
  it("places one order per store with database prices, atomically", async () => {
    let r = await post(sellerA, "/api/orders", {
      university: "diu",
      items: [{ product_id: productA, quantity: 1 }],
      name: "Seller A",
      phone: "0170000",
      address: "Hall",
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("You cannot order from your own store");

    r = await post(buyer, "/api/orders", {
      university: "diu",
      items: [
        { product_id: productA, quantity: 2 },
        { product_id: productB, quantity: 1, price: 1 },
      ],
      name: "Buyer C",
      phone: "01700000000",
      address: "Hall 3, Room 12",
      note: "ring me",
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.ids).toHaveLength(2);
    const orders = (await buyer.get("/api/orders")).body as Array<{
      id: string;
      store_id: string;
      total: number;
      order_items: unknown[];
    }>;
    orderA = orders.find((o) => o.store_id === storeA)!.id;
    orderB = orders.find((o) => o.store_id === storeB)!.id;
    expect(orders.find((o) => o.id === orderA)!.total).toBe(1000);
    expect(orders.find((o) => o.id === orderB)!.total).toBe(250);
    // seller sees only own store's order, with buyer details
    const sellerOrders = (await sellerA.get("/api/seller/orders")).body;
    expect(sellerOrders).toHaveLength(1);
    expect(sellerOrders[0]).toMatchObject({
      customer_phone: "01700000000",
      delivery_address: "Hall 3, Room 12",
    });
    // unavailable product rolls back the whole order
    await patch(sellerB, `/api/seller/products/${productB}`, { in_stock: false });
    r = await post(buyer, "/api/orders", {
      university: "diu",
      items: [
        { product_id: productA, quantity: 1 },
        { product_id: productB, quantity: 1 },
      ],
      name: "Buyer C",
      phone: "0170000",
      address: "Hall",
    });
    expect(r.status).toBe(400);
    expect((await buyer.get("/api/orders")).body).toHaveLength(2);
  });

  it("queues a seller e-mail per order and sends it via Gmail", async () => {
    const jobs = await client.db(dbName).collection("email_outbox").find().toArray();
    expect(jobs.map((j) => j["to_email"]).sort()).toEqual(["a@diu.edu.bd", "b@diu.edu.bd"]);
    expect(jobs.every((j) => j["status"] === "pending")).toBe(true); // Gmail not configured yet

    expect((await request(app).get("/api/cron/order-emails")).status).toBe(401);
    Object.assign(process.env, {
      GMAIL_CLIENT_ID: "id",
      GMAIL_CLIENT_SECRET: "s",
      GMAIL_REFRESH_TOKEN: "r",
      GMAIL_SENDER: "shop@gmail.com",
    });
    const sent: string[] = [];
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (String(url).includes("oauth2.googleapis.com"))
        return Response.json({ access_token: "t", expires_in: 3600 });
      if (String(url).includes("gmail.googleapis.com")) {
        sent.push(Buffer.from(JSON.parse(String(init?.body)).raw, "base64url").toString("utf8"));
        return Response.json({ id: "m" });
      }
      return realFetch(url, init);
    });
    try {
      const r = await request(app)
        .get("/api/cron/order-emails")
        .set("authorization", "Bearer cron-secret-for-tests-123");
      expect(r.body).toEqual({ configured: true, sent: 2, failed: 0 });
      expect(sent.some((m) => m.includes("To: <a@diu.edu.bd>"))).toBe(true);
      const again = await request(app)
        .get("/api/cron/order-emails")
        .set("authorization", "Bearer cron-secret-for-tests-123");
      expect(again.body.sent).toBe(0);
    } finally {
      vi.unstubAllGlobals();
      for (const k of [
        "GMAIL_CLIENT_ID",
        "GMAIL_CLIENT_SECRET",
        "GMAIL_REFRESH_TOKEN",
        "GMAIL_SENDER",
      ])
        delete process.env[k];
    }
  });

  it("respects the seller's order e-mail preference", async () => {
    expect(
      (
        await patch(sellerB, "/api/seller/settings", {
          order_email_enabled: true,
          notification_email: "nope",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await patch(sellerB, "/api/seller/settings", {
          order_email_enabled: false,
          notification_email: "shop.b@gmail.com",
        })
      ).status,
    ).toBe(200);
    expect((await sellerB.get("/api/seller/account")).body.seller).toMatchObject({
      order_email_enabled: false,
      notification_email: "shop.b@gmail.com",
    });
  });

  it("enforces the forward-only order lifecycle and buyer cancel", async () => {
    const set = (a: Agent, id: string, status: string) =>
      post(a, `/api/seller/orders/${id}/status`, { status });
    expect((await set(sellerB, orderA, "confirmed")).status).toBe(404);
    expect((await set(sellerA, orderA, "shipped")).status).toBe(200);
    expect((await set(sellerA, orderA, "pending")).body.error).toBe(
      "Order status can only move forward",
    );
    expect((await post(buyer, `/api/orders/${orderA}/cancel`)).status).toBe(409);
    expect((await set(sellerA, orderA, "delivered")).status).toBe(200);
    expect((await set(sellerA, orderA, "cancelled")).status).toBe(409);
    expect((await post(buyer, `/api/orders/${orderB}/cancel`)).status).toBe(200);
    const buyerNotes = (await buyer.get("/api/notifications?audience=buyer")).body;
    expect(buyerNotes.every((n: { audience: string }) => n.audience === "buyer")).toBe(true);
    expect((await buyer.get("/api/notifications?audience=seller")).body).toHaveLength(0);
    const sellerOnly = (await sellerA.get("/api/notifications?audience=seller")).body;
    expect(sellerOnly.map((n: { title: string }) => n.title)).toContain("New order received");
    expect((await sellerA.get("/api/notifications?audience=buyer")).body).toHaveLength(0);
    const notes = buyerNotes.map((n: { body: string }) => n.body);
    expect(notes.some((b: string) => b.endsWith("is now delivered"))).toBe(true);
    const sellerNotes = (await sellerB.get("/api/notifications")).body.map(
      (n: { title: string }) => n.title,
    );
    expect(sellerNotes).toContain("Order cancelled");
  });

  it("computes seller earnings only from that seller's delivered orders", async () => {
    // Seller A: one delivered order (৳1000). Seller B: one cancelled order.
    const a = (await sellerA.get("/api/seller/earnings")).body;
    expect(a).toMatchObject({
      total_earnings: 1000,
      this_month: 1000,
      delivered_orders: 1,
      awaiting_delivery: 0,
    });
    expect(a.transactions.map((t: { order_id: string }) => t.order_id)).toEqual([orderA]);
    expect(a.transactions[0]).toMatchObject({ amount: 1000, customer_name: "Buyer C" });
    const b = (await sellerB.get("/api/seller/earnings")).body;
    expect(b).toMatchObject({
      total_earnings: 0,
      delivered_orders: 0,
      awaiting_delivery: 0,
      transactions: [],
    });
    // a pending order counts as awaiting delivery, never as earnings
    await patch(sellerB, `/api/seller/products/${productB}`, { in_stock: true });
    await post(buyer, "/api/orders", {
      university: "diu",
      items: [{ product_id: productB, quantity: 2 }],
      name: "Buyer C",
      phone: "01700000000",
      address: "Hall 3",
    });
    const b2 = (await sellerB.get("/api/seller/earnings")).body;
    expect(b2).toMatchObject({ total_earnings: 0, delivered_orders: 0, awaiting_delivery: 500 });
    expect((await request(app).get("/api/seller/earnings")).status).toBe(401);
  });

  it("allows one review per delivered purchase and exposes only public fields", async () => {
    expect(
      (await post(buyer, "/api/reviews", { order_id: orderB, product_id: productB, rating: 5 }))
        .status,
    ).toBe(400);
    expect(
      (await post(sellerA, "/api/reviews", { order_id: orderA, product_id: productA, rating: 5 }))
        .status,
    ).toBe(400);
    expect(
      (
        await post(buyer, "/api/reviews", {
          order_id: orderA,
          product_id: productA,
          rating: 4,
          comment: "Works great",
        })
      ).status,
    ).toBe(201);
    expect(
      (await post(buyer, "/api/reviews", { order_id: orderA, product_id: productA, rating: 1 }))
        .status,
    ).toBe(409);
    const reviews = (await request(app).get(`/api/products/${productA}/reviews?university=diu`))
      .body;
    expect(reviews).toHaveLength(1);
    expect(Object.keys(reviews[0]).sort()).toEqual([
      "author",
      "comment",
      "created_at",
      "id",
      "rating",
    ]);
    expect(reviews[0].author).toBe("Buyer C");
    const listed = (await request(app).get("/api/products?university=diu")).body.find(
      (p: { id: string }) => p.id === productA,
    );
    expect(listed).toMatchObject({ rating: 4, review_count: 1 });
    const dirA = (await request(app).get("/api/stores?university=diu")).body.find(
      (d: { id: string }) => d.id === storeA,
    );
    expect(dirA).toMatchObject({ product_count: 1, rating: 4, review_count: 1 });
    expect((await sellerA.get("/api/seller/reviews")).body[0].product_name).toBe("Calculator");
  });

  it("runs buyer–seller chat with participant-only access", async () => {
    expect(
      (await post(sellerA, "/api/chat/open", { product_id: productA, university: "diu" })).status,
    ).toBe(400);
    const { id } = (
      await post(buyer, "/api/chat/open", { product_id: productA, university: "diu" })
    ).body;
    expect(
      (await post(buyer, "/api/chat/open", { product_id: productA, university: "diu" })).body.id,
    ).toBe(id);
    expect(
      (await post(sellerA, `/api/chat/conversations/${id}/messages`, { body: "hi" })).status,
    ).toBe(409);
    expect((await sellerA.get("/api/chat/conversations?role=seller")).body).toHaveLength(0);
    expect(
      (await post(buyer, `/api/chat/conversations/${id}/messages`, { body: "Is it available?" }))
        .status,
    ).toBe(201);
    expect((await sellerA.get("/api/chat/unread")).body).toEqual({ [id]: 1 });
    expect((await sellerB.get(`/api/chat/conversations/${id}/messages`)).status).toBe(403);
    expect(
      (await post(sellerA, `/api/chat/conversations/${id}/messages`, { body: "Yes!" })).status,
    ).toBe(201);
    await post(sellerA, `/api/chat/conversations/${id}/read`);
    expect((await sellerA.get("/api/chat/unread")).body).toEqual({});
    expect(
      (await sellerA.get("/api/chat/conversations?role=seller")).body[0].last_message_preview,
    ).toBe("Yes!");
  });

  it("features only approved content and unfeatures on suspension", async () => {
    expect(
      (
        await post(adminAgent, "/api/admin/feature", {
          kind: "store",
          id: storeA,
          universitySlug: "diu",
        })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get("/api/stores/featured?university=diu")).body.map(
        (s: { id: string }) => s.id,
      ),
    ).toEqual([storeA]);
    await post(adminAgent, `/api/admin/stores/${storeA}/status`, { status: "suspended" });
    expect((await request(app).get("/api/stores/featured?university=diu")).body).toHaveLength(0);
    expect(
      (await request(app).get("/api/products?university=diu")).body.map(
        (p: { id: string }) => p.id,
      ),
    ).not.toContain(productA);
    expect(
      (
        await post(adminAgent, "/api/admin/feature", {
          kind: "store",
          id: storeA,
          universitySlug: "diu",
        })
      ).status,
    ).toBe(400);
    const summary = (await adminAgent.get("/api/admin/orders")).body.summaries[storeA];
    expect(summary).toMatchObject({ total: 1, delivered: 1, deliveredSales: 1000 });
  });

  it("signs uploads into the user's own folder", async () => {
    const sig = (await post(buyer, "/api/uploads/sign", { kind: "student-id" })).body;
    expect(sig).toMatchObject({ cloudName: "testcloud", type: "authenticated" });
    expect(sig.folder).toBe(`campuscart/student-id/${await userIdOf(buyer)}`);
    expect((await post(buyer, "/api/uploads/sign", { kind: "anything" })).status).toBe(400);
  });

  it("separates university marketplaces on the server (DIU vs NSU)", async () => {
    const sellerN = await signUp("n@nsu.edu.bd", "Seller N");
    const sellerNId = await userIdOf(sellerN);
    const storeN = await makeSellerWithStore(sellerN, sellerNId, "NSU Store", "nsu");
    expect(
      (await post(adminAgent, `/api/admin/stores/${storeN}/status`, { status: "approved" })).status,
    ).toBe(200);
    // re-approve the DIU store B so both marketplaces have a live listing
    await patch(sellerB, `/api/seller/products/${productB}`, { in_stock: true });
    const productN = (
      await post(sellerN, "/api/seller/products", {
        name: "NSU Book",
        category: "textbooks",
        price: 300,
        condition: "used",
      })
    ).body.id as string;

    // catalogue requires and respects the marketplace
    expect((await request(app).get("/api/products")).status).toBe(400);
    expect((await request(app).get("/api/products?university=mit")).status).toBe(400);
    const diu = (await request(app).get("/api/products?university=diu")).body.map(
      (p: { id: string }) => p.id,
    );
    const nsu = (await request(app).get("/api/products?university=nsu")).body.map(
      (p: { id: string }) => p.id,
    );
    expect(diu).toContain(productB);
    expect(diu).not.toContain(productN);
    expect(nsu).toEqual([productN]);
    expect((await request(app).get("/api/stores")).status).toBe(400);
    expect(
      (await request(app).get("/api/stores?university=nsu")).body.map((x: { id: string }) => x.id),
    ).toEqual([storeN]);
    expect((await request(app).get(`/api/stores/${storeN}?university=diu`)).status).toBe(404);
    expect((await request(app).get(`/api/stores/${storeN}?university=nsu`)).status).toBe(200);
    expect(
      (await request(app).get(`/api/products/${productN}/reviews?university=diu`)).body,
    ).toEqual([]);

    // checkout rejects products from another marketplace — atomically
    const ordersBefore = (await buyer.get("/api/orders")).body.length;
    const order = (items: Array<{ product_id: string; quantity: number }>, university: string) =>
      post(buyer, "/api/orders", {
        university,
        items,
        name: "Buyer C",
        phone: "01700000000",
        address: "Hall 3",
      });
    let r = await order([{ product_id: productN, quantity: 1 }], "diu");
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/another university marketplace/);
    r = await order(
      [
        { product_id: productB, quantity: 1 },
        { product_id: productN, quantity: 1 },
      ],
      "diu",
    );
    expect(r.status).toBe(400);
    expect((await order([{ product_id: productB, quantity: 1 }], "mit")).status).toBe(400);
    expect(
      (
        await post(buyer, "/api/orders", {
          items: [{ product_id: productB, quantity: 1 }],
          name: "B",
          phone: "0170000",
          address: "Hall",
        })
      ).status,
    ).toBe(400);
    expect((await buyer.get("/api/orders")).body).toHaveLength(ordersBefore);
    // the same product in its own marketplace works
    r = await order([{ product_id: productN, quantity: 1 }], "nsu");
    expect(r.status).toBe(201);
    const placed = (await buyer.get("/api/orders")).body.find(
      (o: { id: string }) => o.id === r.body.ids[0],
    );
    expect(placed.university_slug).toBe("nsu");

    // chat follows the same rule
    expect(
      (await post(buyer, "/api/chat/open", { product_id: productN, university: "diu" })).status,
    ).toBe(400);
    expect((await post(buyer, "/api/chat/open", { product_id: productN })).status).toBe(400);
    expect(
      (await post(buyer, "/api/chat/open", { product_id: productN, university: "nsu" })).status,
    ).toBe(201);
  });

  it("validates optional original prices and exposes valid offers", async () => {
    const create = (body: object) =>
      post(sellerB, "/api/seller/products", {
        name: "Desk Lamp",
        category: "hostel",
        condition: "new",
        ...body,
      });
    expect((await create({ price: 500, original_price: 500 })).status).toBe(400);
    expect((await create({ price: 500, original_price: 450 })).body.error).toMatch(
      /greater than the selling price/,
    );
    const offer = await create({ price: 500, original_price: 800 });
    expect(offer.status).toBe(201);
    const plain = await create({ name: "Plain Lamp", price: 300 });
    expect(plain.status).toBe(201);
    const listing = (await request(app).get("/api/products?university=diu")).body as Array<{
      id: string;
      original_price?: number | null;
    }>;
    expect(listing.find((p) => p.id === offer.body.id)?.original_price).toBe(800);
    expect(listing.find((p) => p.id === plain.body.id)?.original_price ?? null).toBeNull();
    // raising the selling price above the original price is rejected
    expect(
      (await patch(sellerB, `/api/seller/products/${offer.body.id}`, { price: 900 })).status,
    ).toBe(400);
    expect(
      (await patch(sellerB, `/api/seller/products/${offer.body.id}`, { price: 600 })).status,
    ).toBe(200);
    expect(
      (await patch(sellerB, `/api/seller/products/${offer.body.id}`, { original_price: 550 }))
        .status,
    ).toBe(400);
    // removing the original price turns the offer back into a normal listing
    expect(
      (await patch(sellerB, `/api/seller/products/${offer.body.id}`, { original_price: null }))
        .status,
    ).toBe(200);
    const after = (await request(app).get("/api/products?university=diu")).body.find(
      (p: { id: string }) => p.id === offer.body.id,
    );
    expect(after.original_price ?? null).toBeNull();
    expect(after.price).toBe(600);
  });

  it("lets buyers edit their own profile and keeps the Student ID fixed", async () => {
    const buyerId = await userIdOf(buyer);
    const ok = await patch(buyer, "/api/me", {
      full_name: "Buyer Changed",
      phone: "01799999999",
      department: "EEE",
      batch: "61st (evening)",
      avatar_id: `campuscart/avatar/${buyerId}/me`,
      student_id: "000-00-0000", // not editable: ignored
      email: "spoof@evil.example", // not editable: ignored
      role: "admin", // not editable: ignored
    });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    const meRes = (await buyer.get("/api/me")).body;
    expect(meRes).toMatchObject({
      full_name: "Buyer Changed",
      phone: "01799999999",
      department: "EEE",
      batch: "61st (evening)",
      email: "buyer@diu.edu.bd",
      student_id: "221-15-9999",
      role: "user",
    });
    expect(meRes.avatar_path).toContain("/authenticated/");
    // the session reflects the new name too
    expect((await buyer.get("/api/auth/get-session")).body.user.name).toBe("Buyer Changed");

    // someone else's photo is refused; removing the photo works
    expect(
      (await patch(buyer, "/api/me", { avatar_id: `campuscart/avatar/${sellerAId}/x` })).status,
    ).toBe(400);
    expect((await patch(buyer, "/api/me", { avatar_id: null })).status).toBe(200);
    expect((await buyer.get("/api/me")).body.avatar_path).toBeNull();

    // a buyer without a seller account can't use the seller endpoint
    expect((await patch(buyer, "/api/seller/account", { batch: "62nd" })).status).toBe(404);
    expect(
      (await request(app).patch("/api/me").set("origin", ORIGIN).send({ batch: "x" })).status,
    ).toBe(401);
  });

  it("lets sellers edit personal details and store details, only their own", async () => {
    const sellerC = await signUp("c@diu.edu.bd", "Seller C");
    const sellerCId = await userIdOf(sellerC);
    const storeC = await makeSellerWithStore(sellerC, sellerCId, "Store C");
    expect(
      (await post(adminAgent, `/api/admin/stores/${storeC}/status`, { status: "approved" })).status,
    ).toBe(200);

    // personal details: saved on the seller account and mirrored on the user profile
    const r = await patch(sellerC, "/api/seller/account", {
      full_name: "Seller C Renamed",
      phone: "01822222222",
      department: "SWE",
      batch: "63rd",
      avatar_id: `campuscart/avatar/${sellerCId}/face`,
      university_slug: "nsu", // fixed: ignored
      student_id: "999-99-9999", // fixed: ignored
      email: "spoof@evil.example", // fixed: ignored
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const acc = (await sellerC.get("/api/seller/account")).body;
    expect(acc.seller).toMatchObject({
      full_name: "Seller C Renamed",
      phone: "01822222222",
      department: "SWE",
      batch: "63rd",
      university_slug: "diu",
      email: "c@diu.edu.bd",
      avatar_path: `campuscart/avatar/${sellerCId}/face`,
    });
    expect((await sellerC.get("/api/seller/identity")).body.student_id).toBe("221-15-0001");
    expect((await sellerC.get("/api/me")).body).toMatchObject({
      full_name: "Seller C Renamed",
      batch: "63rd",
    });
    // invalid values are refused
    expect((await patch(sellerC, "/api/seller/account", { batch: "  " })).status).toBe(400);
    expect(
      (
        await patch(sellerC, "/api/seller/account", {
          avatar_id: `campuscart/avatar/${sellerAId}/x`,
        })
      ).status,
    ).toBe(400);

    // editing from the buyer profile updates the seller account as well
    expect((await patch(sellerC, "/api/me", { batch: "63rd (day)" })).status).toBe(200);
    expect((await sellerC.get("/api/seller/account")).body.seller.batch).toBe("63rd (day)");

    // store details: name, description, contact and logo
    const logo = `${CLOUD}/campuscart/store-logo/${sellerCId}/logo.png`;
    const s = await patch(sellerC, "/api/seller/store", {
      name: "Store C Prime",
      description: "Notes and calculators for first years",
      contact_number: "01833333333",
      logo_url: logo,
      category: "Food", // admin-managed: ignored
      status: "approved", // admin-managed: ignored
    });
    expect(s.status, JSON.stringify(s.body)).toBe(200);
    const pub = (await request(app).get(`/api/stores/${storeC}?university=diu`)).body;
    expect(pub).toMatchObject({
      name: "Store C Prime",
      description: "Notes and calculators for first years",
      category: "Electronics",
    });
    expect(
      (
        await patch(sellerC, "/api/seller/store", {
          logo_url: `${CLOUD}/campuscart/store-logo/${sellerAId}/logo.png`,
        })
      ).status,
    ).toBe(400);
    expect((await patch(sellerC, "/api/seller/store", { name: "x" })).status).toBe(400);

    // another seller's edits only ever touch their own store
    const before = (await request(app).get(`/api/stores/${storeC}?university=diu`)).body.name;
    await patch(sellerA, "/api/seller/store", { name: "Hijacked" });
    expect((await request(app).get(`/api/stores/${storeC}?university=diu`)).body.name).toBe(before);
  });

  it("offers Google sign-in only when it is configured", async () => {
    const auth = await import("./lib/auth");
    expect((await request(app).get("/api/auth-providers")).body).toEqual({ google: false });

    process.env["GOOGLE_CLIENT_ID"] = "test-client.apps.googleusercontent.com";
    process.env["GOOGLE_CLIENT_SECRET"] = "test-secret";
    auth.resetAuthForTests();
    try {
      expect((await request(app).get("/api/auth-providers")).body).toEqual({ google: true });
      const r = await request(app)
        .post("/api/auth/sign-in/social")
        .set("origin", ORIGIN)
        .send({ provider: "google", callbackURL: "/account", errorCallbackURL: "/auth" });
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      const url = new URL(r.body.url as string);
      expect(url.hostname).toBe("accounts.google.com");
      expect(url.searchParams.get("client_id")).toBe("test-client.apps.googleusercontent.com");
      expect(url.searchParams.get("redirect_uri")).toMatch(/\/api\/auth\/callback\/google$/);
      expect(url.searchParams.get("prompt")).toBe("select_account");
      // only same-site return addresses are accepted
      const evil = await request(app)
        .post("/api/auth/sign-in/social")
        .set("origin", ORIGIN)
        .send({ provider: "google", callbackURL: "https://evil.example/steal" });
      expect(evil.status).toBe(403);
    } finally {
      delete process.env["GOOGLE_CLIENT_ID"];
      delete process.env["GOOGLE_CLIENT_SECRET"];
      auth.resetAuthForTests();
    }
    expect((await request(app).get("/api/auth-providers")).body).toEqual({ google: false });
  });

  // ---- Campus modules ---------------------------------------------------------

  describe("campus modules", () => {
    let alice: Agent, bob: Agent;
    let aliceId: string, bobId: string;
    const img = (kind: string, uid: string, name = "a.jpg") =>
      `${CLOUD}/campuscart/${kind}/${uid}/${name}`;
    const del = (a: Agent, url: string) => a.delete(url).set("origin", ORIGIN);

    it("sets up two students", async () => {
      alice = await signUp("alice@diu.edu.bd", "Alice Rahman", { studentId: "221-15-1111" });
      bob = await signUp("bob@diu.edu.bd", "Bob Karim");
      aliceId = await userIdOf(alice);
      bobId = await userIdOf(bob);
    });

    let calc: string;
    it("Pre-Owned: owners create, edit, sell and delete; others can't", async () => {
      const body = {
        university_slug: "diu",
        title: "Casio FX-991 calculator",
        description: "Used for two semesters, works perfectly.",
        category: "Electronics",
        price: 900,
        original_price: 1600,
        condition: "good",
        images: [img("preowned", aliceId)],
        location: "Hall 2",
      };
      expect(
        (await request(app).post("/api/preowned").set("origin", ORIGIN).send(body)).status,
      ).toBe(401);
      expect(
        (await post(alice, "/api/preowned", { ...body, images: [img("preowned", bobId)] })).status,
      ).toBe(400); // someone else's upload folder
      expect((await post(alice, "/api/preowned", { ...body, original_price: 500 })).status).toBe(
        400,
      );
      const r = await post(alice, "/api/preowned", body);
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      calc = r.body.id;
      expect(r.body).toMatchObject({ status: "available", is_owner: true, owner_id: aliceId });

      // public view hides the owner's user id and contact details
      const pub = (await request(app).get(`/api/preowned/${calc}`)).body;
      expect(pub).toMatchObject({ title: body.title, owner_id: "", is_owner: false });
      expect(pub.owner).toMatchObject({ id: "", name: "Alice Rahman" });
      expect(JSON.stringify(pub)).not.toMatch(/alice@diu|221-15-1111|01700000000/);

      // others can't change or delete it
      expect((await patch(bob, `/api/preowned/${calc}`, { price: 1 })).status).toBe(403);
      expect((await patch(bob, `/api/preowned/${calc}/status`, { status: "sold" })).status).toBe(
        403,
      );
      expect((await del(bob, `/api/preowned/${calc}`)).status).toBe(403);

      // filters and sort
      const list = (q: string) => request(app).get(`/api/preowned?university=diu${q}`);
      expect((await list("&q=casio")).body.map((l: { id: string }) => l.id)).toContain(calc);
      expect((await list("&q=bicycle")).body).toHaveLength(0);
      expect((await list("&min=1000")).body).toHaveLength(0);
      expect((await list("&condition=good&location=hall")).body).toHaveLength(1);
      expect((await list("&q=(")).status).toBe(200); // user text never becomes a regex

      expect((await patch(alice, `/api/preowned/${calc}`, { price: 850 })).status).toBe(200);
      expect((await patch(alice, `/api/preowned/${calc}/status`, { status: "sold" })).status).toBe(
        200,
      );
      expect((await list("")).body).toHaveLength(0);
      expect((await list("&status=sold")).body).toHaveLength(1);
      expect(
        (await patch(alice, `/api/preowned/${calc}/status`, { status: "available" })).status,
      ).toBe(200);
      expect((await alice.get("/api/preowned/mine")).body[0]).toMatchObject({
        id: calc,
        price: 850,
      });
    });

    it("Pre-Owned never appears in the Marketplace; search scopes are enforced by the API", async () => {
      const products = (await request(app).get("/api/products?university=diu")).body as Array<{
        id: string;
      }>;
      expect(products.some((p) => p.id === calc)).toBe(false);
      const s = async (scope?: string) =>
        (
          await request(app).get(
            `/api/search?university=diu&q=casio${scope ? `&scope=${scope}` : ""}`,
          )
        ).body;
      expect(await s()).toMatchObject({ scope: "marketplace", preowned: [] });
      const pre = await s("preowned");
      expect(pre.marketplace).toEqual([]);
      expect(pre.preowned.map((l: { id: string }) => l.id)).toEqual([calc]);
      const all = await s("all");
      expect(all.preowned).toHaveLength(1);
      // a Marketplace product shows under "marketplace" in "all", never under "preowned"
      const prodName = products[0] ? (products[0] as unknown as { name: string }).name : null;
      if (prodName) {
        const both = (
          await request(app).get(
            `/api/search?university=diu&scope=all&q=${encodeURIComponent(prodName.slice(0, 6))}`,
          )
        ).body;
        expect(both.marketplace.length).toBeGreaterThan(0);
        expect(both.preowned.some((l: { title: string }) => l.title === prodName)).toBe(false);
      }
      // other universities don't see DIU listings
      expect((await request(app).get("/api/preowned?university=nsu")).body).toHaveLength(0);
    });

    it("Pre-Owned messaging is tied to the listing and follows chat rules", async () => {
      expect(
        (await post(alice, "/api/chat/open-context", { kind: "preowned", id: calc })).status,
      ).toBe(400);
      const open = await post(bob, "/api/chat/open-context", { kind: "preowned", id: calc });
      expect(open.status, JSON.stringify(open.body)).toBe(201);
      const again = await post(bob, "/api/chat/open-context", { kind: "preowned", id: calc });
      expect(again.body.id).toBe(open.body.id); // no duplicate conversation
      const conv = (await bob.get(`/api/chat/conversations/${open.body.id}`)).body;
      expect(conv).toMatchObject({
        kind: "preowned",
        context_id: calc,
        product_name: "Casio FX-991 calculator",
        product_price: 850,
        owner_name: "Alice Rahman",
      });
      // the owner can't message first, then can reply once the buyer has
      expect(
        (await post(alice, `/api/chat/conversations/${open.body.id}/messages`, { body: "hi" }))
          .status,
      ).toBe(409);
      expect(
        (
          await post(bob, `/api/chat/conversations/${open.body.id}/messages`, {
            body: "Is it still available?",
          })
        ).status,
      ).toBe(201);
      const aliceInbox = (await alice.get("/api/chat/conversations?role=buyer")).body as Array<{
        id: string;
      }>;
      expect(aliceInbox.map((c) => c.id)).toContain(open.body.id);
      const aliceSellerInbox = (await alice.get("/api/chat/conversations?role=seller"))
        .body as Array<{ id: string }>;
      expect(aliceSellerInbox.map((c) => c.id)).not.toContain(open.body.id);
      expect(
        (await post(alice, `/api/chat/conversations/${open.body.id}/messages`, { body: "Yes" }))
          .status,
      ).toBe(201);
      // strangers can't read it
      expect((await sellerA.get(`/api/chat/conversations/${open.body.id}/messages`)).status).toBe(
        403,
      );
    });

    let reqId: string;
    it("Blood requests: create, filter, status, ownership and private contact", async () => {
      const base = {
        university_slug: "diu",
        blood_group: "B+",
        hospital_name: "Dhaka Medical College Hospital",
        hospital_location: "Bakshibazar, Dhaka",
        needed_on: "2026-12-05",
        donors_needed: 2,
        description: "Surgery on Friday morning.",
      };
      expect(
        (await post(alice, "/api/blood/requests", { ...base, contact_preference: "phone" })).status,
      ).toBe(400); // phone chosen but no number given
      const r = await post(alice, "/api/blood/requests", {
        ...base,
        contact_preference: "messages",
        contact_phone: "01711111111",
      });
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      reqId = r.body.id;
      expect(r.body.contact_phone).toBeNull(); // not shared unless chosen
      const list = (q: string) => request(app).get(`/api/blood/requests?university=diu${q}`);
      expect((await list("&blood_group=B%2B")).body).toHaveLength(1);
      expect((await list("&blood_group=O-")).body).toHaveLength(0);
      expect((await list("&location=bakshi")).body).toHaveLength(1);
      expect(
        (await patch(bob, `/api/blood/requests/${reqId}/status`, { status: "fulfilled" })).status,
      ).toBe(403);
      expect((await del(bob, `/api/blood/requests/${reqId}`)).status).toBe(403);
      expect(
        (await patch(alice, `/api/blood/requests/${reqId}`, { donors_needed: 3 })).status,
      ).toBe(200);
      const open = await post(bob, "/api/chat/open-context", { kind: "blood_request", id: reqId });
      expect(open.status).toBe(201);
      expect((await bob.get(`/api/chat/conversations/${open.body.id}`)).body).toMatchObject({
        kind: "blood_request",
        product_name: "B+ blood needed",
      });
      expect(
        (await patch(alice, `/api/blood/requests/${reqId}/status`, { status: "fulfilled" })).status,
      ).toBe(200);
      expect((await list("")).body).toHaveLength(0);
      expect((await list("&status=fulfilled")).body).toHaveLength(1);
      expect((await alice.get("/api/blood/requests/mine")).body).toHaveLength(1);
    });

    let donorId: string;
    it("Donor profiles: one per user, availability, privacy", async () => {
      const r = await bob.put("/api/blood/donors/me").set("origin", ORIGIN).send({
        university_slug: "diu",
        name: "Bob K.",
        blood_group: "O-",
        department: "CSE",
        batch: "61st",
        location: "Ashulia",
        contact_preference: "phone",
        contact_phone: "01822222222",
      });
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      donorId = r.body.id;
      const pub = (await request(app).get("/api/blood/donors?university=diu&blood_group=O-")).body;
      expect(pub).toHaveLength(1);
      expect(pub[0]).toMatchObject({ name: "Bob K.", contact_phone: "01822222222", owner_id: "" });
      expect(JSON.stringify(pub)).not.toMatch(/bob@diu/);
      // second PUT updates the same profile
      const r2 = await bob.put("/api/blood/donors/me").set("origin", ORIGIN).send({
        university_slug: "diu",
        name: "Bob K.",
        blood_group: "O-",
        location: "Ashulia",
        contact_preference: "messages",
        contact_phone: "01822222222",
      });
      expect(r2.body.id).toBe(donorId);
      expect(r2.body.contact_phone).toBeNull();
      expect(
        (await patch(bob, "/api/blood/donors/me/availability", { availability: "unavailable" }))
          .status,
      ).toBe(200);
      expect((await request(app).get("/api/blood/donors?university=diu")).body).toHaveLength(0);
      expect(
        (await request(app).get("/api/blood/donors?university=diu&availability=all")).body,
      ).toHaveLength(1);
      expect(
        (await post(bob, "/api/chat/open-context", { kind: "donor", id: donorId })).status,
      ).toBe(400);
      await patch(bob, "/api/blood/donors/me/availability", { availability: "available" });
      expect(
        (await post(alice, "/api/chat/open-context", { kind: "donor", id: donorId })).status,
      ).toBe(201);
      // alice has no donor profile to change
      expect(
        (await patch(alice, "/api/blood/donors/me/availability", { availability: "available" }))
          .status,
      ).toBe(404);
    });

    let flat: string;
    it("BashaLagbe: conditional fields, private address, filters and statuses", async () => {
      const facilities = {
        attached_bathroom: false,
        bathroom_type: "private",
        balcony: true,
        kitchen: true,
        kitchen_type: "shared",
        furnished: false,
        electricity: true,
        water: true,
        wifi: true,
        gas: false,
        other: "",
        rules: "No smoking",
      };
      const base = {
        university_slug: "diu",
        title: "Bright 2-bed flat near Daffodil Smart City",
        type: "apartment",
        rent: 14000,
        advance: 28000,
        available_from: "2026-12-01",
        area: "Ashulia",
        address: "House 12, Road 3, Khagan",
        address_public: false,
        images: [img("basha", aliceId)],
        description: "Two bedrooms, one bathroom, ten minutes' walk from campus.",
        facilities,
        roommate: { available_seats: 1, current_roommates: 2 },
      };
      expect(
        (await post(alice, "/api/basha", { ...base, map_url: "https://evil.example/x" })).status,
      ).toBe(400);
      expect(
        (await post(alice, "/api/basha", { ...base, type: "shared_room", roommate: null })).status,
      ).toBe(400);
      expect(
        (
          await post(alice, "/api/basha", {
            ...base,
            facilities: { ...facilities, attached_bathroom: true, bathroom_type: null },
          })
        ).status,
      ).toBe(400);
      const r = await post(alice, "/api/basha", {
        ...base,
        map_url: "https://maps.app.goo.gl/abc123",
      });
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      flat = r.body.id;
      expect(r.body.roommate).toBeNull(); // not kept for full apartments
      expect(r.body.facilities).toMatchObject({ bathroom_type: null, kitchen_type: "shared" });
      expect(r.body.address).toBe(base.address); // owner sees it

      const pub = (await request(app).get(`/api/basha/${flat}`)).body;
      expect(pub.address).toBeNull(); // private address hidden from others
      expect(pub.map_url).toBeNull();

      const room = await post(alice, "/api/basha", {
        ...base,
        title: "Seat available in shared room",
        type: "shared_room",
        rent: 4000,
        address_public: true,
        roommate: { available_seats: 1, current_roommates: 2, gender_preference: "Male" },
      });
      expect(room.status).toBe(201);
      expect(room.body.roommate).toMatchObject({ available_seats: 1, current_roommates: 2 });
      expect((await request(app).get(`/api/basha/${room.body.id}`)).body.address).toBe(
        base.address,
      );

      const list = (q: string) => request(app).get(`/api/basha?university=diu${q}`);
      expect((await list("")).body).toHaveLength(2);
      expect((await list("&type=apartment")).body).toHaveLength(1);
      expect((await list("&max=5000")).body).toHaveLength(1);
      expect((await list("&facilities=balcony,wifi")).body).toHaveLength(2);
      expect((await list("&facilities=gas")).body).toHaveLength(0);
      expect((await list("&available_by=2026-11-15")).body).toHaveLength(0);
      const asc = (await list("&sort=rent_asc")).body as Array<{ rent: number }>;
      expect(asc.map((l) => l.rent)).toEqual([4000, 14000]);

      expect((await patch(bob, `/api/basha/${flat}`, { rent: 1 })).status).toBe(403);
      expect((await patch(alice, `/api/basha/${flat}/status`, { status: "rented" })).status).toBe(
        200,
      );
      expect((await list("")).body).toHaveLength(1);
      expect(
        (await post(bob, "/api/chat/open-context", { kind: "basha", id: room.body.id })).status,
      ).toBe(201);
      expect((await del(alice, `/api/basha/${room.body.id}`)).status).toBe(200);
    });

    it("reports and admin moderation", async () => {
      const report = {
        target_type: "preowned",
        target_id: calc,
        reason: "misleading",
        details: "Wrong model",
      };
      expect((await post(alice, "/api/reports", report)).status).toBe(400); // own post
      expect((await post(bob, "/api/reports", report)).status).toBe(201);
      expect((await post(bob, "/api/reports", report)).status).toBe(409);
      expect((await bob.get("/api/admin/reports")).status).toBe(403);

      const reports = (await adminAgent.get("/api/admin/reports")).body;
      expect(reports[0]).toMatchObject({
        target_type: "preowned",
        target_title: "Casio FX-991 calculator",
        status: "open",
      });
      const rows = (await adminAgent.get("/api/admin/modules/preowned")).body;
      expect(rows.find((r: { id: string }) => r.id === calc)).toMatchObject({
        open_reports: 1,
        owner_name: "Alice Rahman",
      });

      expect(
        (
          await post(adminAgent, `/api/admin/modules/preowned/${calc}/moderation`, {
            moderation: "hidden",
          })
        ).status,
      ).toBe(200);
      expect((await request(app).get(`/api/preowned/${calc}`)).status).toBe(404);
      expect((await request(app).get("/api/preowned?university=diu")).body).toHaveLength(0);
      expect((await alice.get(`/api/preowned/${calc}`)).status).toBe(200); // owner still sees it
      expect(
        (await patch(adminAgent, `/api/admin/reports/${reports[0].id}`, { status: "reviewed" }))
          .status,
      ).toBe(200);

      expect((await adminAgent.get("/api/admin/modules/blood_request")).body).toHaveLength(1);
      expect((await adminAgent.get("/api/admin/modules/donor")).body).toHaveLength(1);
      expect((await del(adminAgent, `/api/admin/modules/basha/${flat}`)).status).toBe(200);
      expect((await request(app).get(`/api/basha/${flat}`)).status).toBe(404);
      expect((await adminAgent.get("/api/admin/modules/nope")).status).toBe(400);
    });

    it("owners delete their own records", async () => {
      expect((await del(alice, `/api/preowned/${calc}`)).status).toBe(200);
      expect((await del(alice, `/api/blood/requests/${reqId}`)).status).toBe(200);
      expect((await del(bob, "/api/blood/donors/me")).status).toBe(200);
      expect((await bob.get("/api/blood/donors/me")).body).toBeNull();
    });
  });
});
