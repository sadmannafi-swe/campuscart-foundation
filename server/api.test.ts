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
});
