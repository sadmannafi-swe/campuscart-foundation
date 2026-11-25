/**
 * Seller payments end to end against a real MongoDB (replica set, for transactions):
 * the 5% platform fee, the December 2026 launch month, overdue suspension and
 * restore, promotion packages and timing, bKash/Nagad submissions, admin
 * verification and access control. Time-dependent steps call the billing engine
 * with explicit dates in 2027; everything else goes through the HTTP API.
 * Run with TEST_MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0 — skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";

const MONGO = process.env["TEST_MONGODB_URI"];
const ORIGIN = "http://localhost:5173";

/** A Dhaka wall-clock time as a UTC Date (Dhaka = UTC+6). */
const dhaka = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h - 6, min));

describe.skipIf(!MONGO)("Seller payments: platform fee, promotions, verification", () => {
  let client: MongoClient;
  let app: import("express").Express;
  let db: typeof import("./lib/db");
  let billing: typeof import("./lib/billing");
  const dbName = `cc_pay_${Date.now()}`;

  beforeAll(async () => {
    process.env["CLOUDINARY_URL"] = "cloudinary://key:secret@testcloud";
    process.env["ADMIN_EMAILS"] = "admin@diu.edu.bd";
    process.env["CRON_SECRET"] = "cron-secret-for-tests-123";
    delete process.env["GMAIL_CLIENT_ID"];
    process.env["MONGODB_URI"] ??= MONGO;
    client = new MongoClient(MONGO!);
    await client.connect();
    db = await import("./lib/db");
    db.setDbForTests(client, dbName);
    billing = await import("./lib/billing");
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
  const put = (a: Agent, url: string, body: object) => a.put(url).set("origin", ORIGIN).send(body);

  async function signUp(email: string, name: string) {
    const a = agent();
    const r = await post(a, "/api/auth/sign-up/email", {
      email,
      password: "password123",
      name,
      phone: "01700000000",
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    return a;
  }
  const userIdOf = async (a: Agent) => (await a.get("/api/me")).body.id as string;

  async function openStore(a: Agent, name: string): Promise<string> {
    const uid = await userIdOf(a);
    let r = await post(a, "/api/seller/account", {
      university_slug: "diu",
      full_name: `${name} Owner`,
      phone: "01711111111",
      department: "CSE",
      batch: "60",
      student_id: "221-15-0001",
      student_id_image: `campuscart/student-id/${uid}/card`,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    r = await post(a, "/api/seller/store", {
      name,
      description: "Things students need on campus",
      category: "Electronics",
      contact_number: "01711111111",
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    return r.body.id as string;
  }

  async function addProduct(a: Agent, name: string): Promise<string> {
    const r = await post(a, "/api/seller/products", {
      name,
      category: "Electronics",
      price: 100,
      condition: "new",
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    return r.body.id as string;
  }

  /** A real order document (as checkout writes it) with a chosen status/date. */
  async function order(
    storeId: string,
    subtotal: number,
    status: "delivered" | "cancelled" | "pending",
    at: Date,
    extra: { refunded_amount?: number; shipping_fee?: number } = {},
  ) {
    const store = (await db.col.stores().findOne({ _id: storeId }))!;
    await db.col.orders().insertOne({
      _id: randomUUID(),
      buyer_id: buyerId,
      store_id: storeId,
      seller_id: store.seller_id,
      seller_user_id: store.user_id,
      university_slug: "diu",
      customer_name: "Buyer",
      customer_phone: "01700000000",
      delivery_address: "Hall 1",
      note: "",
      subtotal,
      shipping_fee: extra.shipping_fee ?? 0,
      total: subtotal + (extra.shipping_fee ?? 0),
      status,
      delivered_at: status === "delivered" ? at : null,
      refunded_amount: extra.refunded_amount ?? null,
      items: [],
      created_at: at,
      updated_at: at,
    });
  }

  let admin: Agent, buyer: Agent, sA: Agent, sB: Agent, sC: Agent, sD: Agent;
  let buyerId: string;
  let storeA: string, storeB: string, storeC: string, storeD: string;
  const productsA: string[] = [];
  const productsC: string[] = [];
  let productB: string;
  const inv: Record<string, { id: string; fee: number }> = {};

  it("sets up an admin, a buyer and four approved stores with real orders", async () => {
    admin = await signUp("admin@diu.edu.bd", "Admin");
    await client
      .db(dbName)
      .collection("user")
      .updateOne({ email: "admin@diu.edu.bd" }, { $set: { emailVerified: true } });
    buyer = await signUp("buyer@diu.edu.bd", "Buyer");
    buyerId = await userIdOf(buyer);
    sA = await signUp("a@diu.edu.bd", "Seller A");
    sB = await signUp("b@diu.edu.bd", "Seller B");
    sC = await signUp("c@diu.edu.bd", "Seller C");
    sD = await signUp("d@diu.edu.bd", "Seller D");
    storeA = await openStore(sA, "Store A");
    storeB = await openStore(sB, "Store B");
    storeC = await openStore(sC, "Store C");
    storeD = await openStore(sD, "Store D");
    for (const id of [storeA, storeB, storeC, storeD]) {
      const r = await post(admin, `/api/admin/stores/${id}/status`, { status: "approved" });
      expect(r.status).toBe(200);
    }
    for (let i = 0; i < 5; i++) productsA.push(await addProduct(sA, `A item ${i}`));
    for (let i = 0; i < 2; i++) productsC.push(await addProduct(sC, `C item ${i}`));
    productB = await addProduct(sB, "B item");

    // Store creation dates from the spec (Dhaka time); D opened in the free launch month.
    const setCreated = (id: string, d: Date) =>
      db.col.stores().updateOne({ _id: id }, { $set: { created_at: d } });
    await setCreated(storeA, dhaka(2027, 1, 1));
    await setCreated(storeB, dhaka(2027, 1, 15));
    await setCreated(storeC, dhaka(2027, 1, 25));
    await setCreated(storeD, dhaka(2026, 12, 5));

    // A: ৳10,000 of January sales = 6,000 + (4,500 − 500 refunded). Delivery charge excluded.
    await order(storeA, 6000, "delivered", dhaka(2027, 1, 3, 12), { shipping_fee: 120 });
    await order(storeA, 4500, "delivered", dhaka(2027, 1, 31, 23, 59), { refunded_amount: 500 });
    await order(storeA, 8000, "cancelled", dhaka(2027, 1, 20)); // excluded
    await order(storeA, 3000, "pending", dhaka(2027, 1, 21)); // not completed: excluded
    await order(storeA, 900, "delivered", dhaka(2027, 2, 1, 0, 5)); // February, not January
    // B (created Jan 15): ৳5,000 counted; a sale dated before the store existed is never charged.
    await order(storeB, 9999, "delivered", dhaka(2027, 1, 10));
    await order(storeB, 5000, "delivered", dhaka(2027, 1, 20));
    // C (created Jan 25): ৳2,000.
    await order(storeC, 2000, "delivered", dhaka(2027, 1, 28));
    await order(storeC, 7000, "cancelled", dhaka(2027, 1, 29));
    // D: December 2026 is free (still recorded); ৳1,000 in January → ৳50.
    await order(storeD, 5000, "delivered", dhaka(2026, 12, 20));
    await order(storeD, 1000, "delivered", dhaka(2027, 1, 5));
  });

  it("Dhaka calendar helpers: periods, deadlines and the launch month", () => {
    expect(billing.monthKeyOf(new Date("2027-01-31T18:30:00Z"))).toBe("2027-02"); // 00:30 Feb 1 Dhaka
    expect(billing.dueAt("2027-01").toISOString()).toBe("2027-02-10T18:00:00.000Z"); // end of Feb 10
    expect(billing.deadlineLabel("2027-01")).toBe("10 Feb 2027");
    expect(billing.billingPeriod(dhaka(2026, 12, 5), "2026-12")).toBeNull();
    const p = billing.billingPeriod(dhaka(2027, 1, 20), "2027-01")!;
    expect(p.start.toISOString()).toBe(dhaka(2027, 1, 20).toISOString());
    expect(p.end.toISOString()).toBe(dhaka(2027, 2, 1).toISOString());
    // after the first partial month: whole calendar months
    const feb = billing.billingPeriod(dhaka(2027, 1, 20), "2027-02")!;
    expect(feb.start.toISOString()).toBe(dhaka(2027, 2, 1).toISOString());
    expect(feb.end.toISOString()).toBe(dhaka(2027, 3, 1).toISOString());
  });

  it("no invoice is ever generated for December 2026", async () => {
    expect(await billing.generateInvoices(dhaka(2027, 1, 1, 0, 10))).toBe(0);
    expect(await db.col.invoices().countDocuments({})).toBe(0);
  });

  it("invoices January 2027 on February 1 from delivered sales only (5%)", async () => {
    const created = await billing.generateInvoices(dhaka(2027, 2, 1, 0, 10));
    expect(created).toBe(4);
    const list = await db.col.invoices().find({}).toArray();
    expect(list.every((i) => i.billing_month === "2027-01")).toBe(true);
    const by = (id: string) => list.find((i) => i.store_id === id)!;
    expect(by(storeA)).toMatchObject({ eligible_sales: 10000, fee: 500, order_count: 2 });
    expect(by(storeB)).toMatchObject({ eligible_sales: 5000, fee: 250, order_count: 1 });
    expect(by(storeC)).toMatchObject({ eligible_sales: 2000, fee: 100 });
    expect(by(storeD)).toMatchObject({ eligible_sales: 1000, fee: 50 });
    expect(by(storeB).period_start.toISOString()).toBe(dhaka(2027, 1, 15).toISOString());
    for (const i of list) {
      expect(i.status).toBe("pending");
      expect(i.due_at.toISOString()).toBe("2027-02-10T18:00:00.000Z");
      inv[i.store_id] = { id: i._id, fee: i.fee };
    }
    // the seller was told about the fee
    const note = await db.col
      .notifications()
      .findOne({ kind: "platform_fee", user_id: await userIdOf(sA) });
    expect(note?.body).toContain("৳500");
  });

  it("running the billing job again never duplicates or re-charges", async () => {
    expect(await billing.generateInvoices(dhaka(2027, 2, 1, 0, 10))).toBe(0);
    await db.col.billingRuns().deleteMany({}); // even without the month marker…
    expect(await billing.generateInvoices(dhaka(2027, 2, 2))).toBe(0); // …the unique index holds
    expect(await db.col.invoices().countDocuments({})).toBe(4);
    await expect(
      db.col.invoices().insertOne({
        ...(await db.col.invoices().findOne({ store_id: storeA }))!,
        _id: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("only admins see or change the receiving numbers; sellers see enabled methods only", async () => {
    expect((await request(app).get("/api/admin/payments/config")).status).toBe(401);
    expect((await sA.get("/api/admin/payments/config")).status).toBe(403);
    expect((await put(sA, "/api/admin/payments/config", {})).status).toBe(403);
    let r = await put(admin, "/api/admin/payments/config", {
      bkash_number: "01811111111",
      nagad_number: "",
      bkash_enabled: true,
      nagad_enabled: true,
    });
    expect(r.status).toBe(400); // can't enable Nagad without a number
    r = await put(admin, "/api/admin/payments/config", {
      bkash_number: "+880 1811-111111",
      nagad_number: "01922222222",
      bkash_enabled: true,
      nagad_enabled: false,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const view = await sA.get("/api/seller/payments");
    expect(view.status).toBe(200);
    expect(view.body.methods).toEqual([{ method: "bkash", number: "01811111111" }]);
    // a disabled method can't be used
    r = await post(sC, "/api/seller/payments", {
      type: "platform_fee",
      invoice_id: inv[storeC]!.id,
      method: "nagad",
      sender_phone: "01712345678",
      trx_id: "NGD12345",
      amount: 100,
      confirmed: true,
    });
    expect(r.status).toBe(400);
    r = await put(admin, "/api/admin/payments/config", {
      bkash_number: "01811111111",
      nagad_number: "01922222222",
      bkash_enabled: true,
      nagad_enabled: true,
    });
    expect(r.status).toBe(200);
    expect((await sA.get("/api/seller/payments")).body.methods).toHaveLength(2);
    // the public catalogue never carries payment numbers
    const pub = await request(app).get("/api/products?university=diu");
    expect(JSON.stringify(pub.body)).not.toContain("01811111111");
  });

  let subC: string, subB: string;

  it("records a bKash submission as PENDING_VERIFICATION with server-side values", async () => {
    const r = await post(sC, "/api/seller/payments", {
      type: "platform_fee",
      invoice_id: inv[storeC]!.id,
      method: "bkash",
      sender_phone: "017 1234 5678",
      trx_id: "8n7a6b5c4d",
      amount: 100,
      confirmed: true,
      // all ignored: never trusted from the browser
      store_id: storeA,
      seller_id: "x",
      status: "confirmed",
      expected_amount: 1,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    subC = r.body.id;
    expect(r.body).toMatchObject({
      status: "pending_verification",
      receiver_number: "01811111111",
      sender_phone: "01712345678",
      trx_id: "8N7A6B5C4D",
      expected_amount: 100,
      submitted_amount: 100,
    });
    expect(r.body.admin_note).toBeUndefined();
    const doc = (await db.col.paymentSubmissions().findOne({ _id: subC }))!;
    expect(doc).toMatchObject({
      store_id: storeC,
      store_name: "Store C",
      seller_email: "c@diu.edu.bd",
    });
    expect((await db.col.invoices().findOne({ _id: inv[storeC]!.id }))!.status).toBe("submitted");
    // must tick the confirmation
    const noConfirm = await post(sD, "/api/seller/payments", {
      type: "platform_fee",
      invoice_id: inv[storeD]!.id,
      method: "bkash",
      sender_phone: "01712345678",
      trx_id: "ABCDEF1234",
      amount: 50,
      confirmed: false,
    });
    expect(noConfirm.status).toBe(400);
  });

  it("flags a different amount, blocks duplicates and other stores' bills", async () => {
    let r = await post(sB, "/api/seller/payments", {
      type: "platform_fee",
      invoice_id: inv[storeB]!.id,
      method: "nagad",
      sender_phone: "01898765432",
      trx_id: "NGD0001X",
      amount: 200, // expected 250
      confirmed: true,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    subB = r.body.id;
    expect(r.body.receiver_number).toBe("01922222222");
    // same bill again while waiting → refused
    r = await post(sB, "/api/seller/payments", {
      type: "platform_fee",
      invoice_id: inv[storeB]!.id,
      method: "nagad",
      sender_phone: "01898765432",
      trx_id: "NGD0002X",
      amount: 250,
      confirmed: true,
    });
    expect(r.status).toBe(409);
    // a TrxID already used (by another store) → refused
    r = await post(sD, "/api/seller/payments", {
      type: "platform_fee",
      invoice_id: inv[storeD]!.id,
      method: "bkash",
      sender_phone: "01712345678",
      trx_id: "8N7A6B5C4D",
      amount: 50,
      confirmed: true,
    });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/transaction ID has already been submitted/);
    // another seller's invoice → not found
    r = await post(sA, "/api/seller/payments", {
      type: "platform_fee",
      invoice_id: inv[storeB]!.id,
      method: "bkash",
      sender_phone: "01712345678",
      trx_id: "ZZZZ99999",
      amount: 250,
      confirmed: true,
    });
    expect(r.status).toBe(404);
    // admin sees the difference
    const pending = await admin.get("/api/admin/payments/submissions?status=pending_verification");
    const b = pending.body.find((s: { id: string }) => s.id === subB);
    expect(b).toMatchObject({
      expected_amount: 250,
      submitted_amount: 200,
      amount_difference: -50,
      seller_email: "b@diu.edu.bd",
      method: "nagad",
      sender_phone: "01898765432",
      receiver_number: "01922222222",
      trx_id: "NGD0001X",
      billing_month: "2027-01",
    });
  });

  it("sellers can't verify payments or read anyone else's records", async () => {
    expect(
      (await post(sC, `/api/admin/payments/submissions/${subC}/confirm`, { verified_amount: 100 }))
        .status,
    ).toBe(403);
    expect((await sC.get("/api/admin/payments/overview")).status).toBe(403);
    expect((await buyer.get("/api/admin/payments/submissions")).status).toBe(403);
    expect((await buyer.get("/api/seller/payments")).status).toBe(404); // no store
    expect((await request(app).get("/api/seller/payments")).status).toBe(401);
    const aView = await sA.get("/api/seller/payments");
    expect(aView.body.submissions).toHaveLength(0); // A sees none of B/C's payments
    expect(aView.body.invoices.map((i: { store_id: string }) => i.store_id)).toEqual([storeA]);
    expect(JSON.stringify(aView.body)).not.toContain("NGD0001X");
  });

  it("admin confirms C (paid) and rejects B with a reason; B corrects and resubmits", async () => {
    let r = await post(admin, `/api/admin/payments/submissions/${subC}/confirm`, {
      verified_amount: 100,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const c = (await db.col.invoices().findOne({ _id: inv[storeC]!.id }))!;
    expect(c).toMatchObject({ status: "paid", paid_amount: 100 });
    expect(c.verified_by).toBe(await userIdOf(admin));
    // confirming twice is refused
    expect(
      (
        await post(admin, `/api/admin/payments/submissions/${subC}/confirm`, {
          verified_amount: 100,
        })
      ).status,
    ).toBe(409);

    expect((await post(admin, `/api/admin/payments/submissions/${subB}/reject`, {})).status).toBe(
      400,
    ); // reason required
    r = await post(admin, `/api/admin/payments/submissions/${subB}/reject`, {
      reason: "Received ৳200, the fee is ৳250",
    });
    expect(r.status).toBe(200);
    expect((await db.col.invoices().findOne({ _id: inv[storeB]!.id }))!.status).toBe("rejected");
    const bView = await sB.get("/api/seller/payments");
    expect(bView.body.submissions[0]).toMatchObject({
      status: "rejected",
      rejection_reason: "Received ৳200, the fee is ৳250",
    });
    expect(bView.body.invoices[0].display_status).toBe("rejected");
    // corrected payment (same TrxID is allowed again after a rejection)
    r = await post(sB, "/api/seller/payments", {
      type: "platform_fee",
      invoice_id: inv[storeB]!.id,
      method: "nagad",
      sender_phone: "01898765432",
      trx_id: "NGD0001X",
      amount: 250,
      confirmed: true,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    subB = r.body.id;
    const audit = await admin.get("/api/admin/payments/audit");
    const actions = audit.body.map((a: { action: string }) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining(["confirm_payment", "reject_payment", "update_payment_numbers"]),
    );
    expect(audit.body.find((a: { action: string }) => a.action === "reject_payment")).toMatchObject(
      {
        previous_status: "pending_verification",
        new_status: "rejected",
        actor_name: "Admin",
      },
    );
  });

  it("after February 10 unpaid stores are unpublished but keep dashboard and payments", async () => {
    expect(await billing.markOverdue(dhaka(2027, 2, 10, 23, 59))).toBe(0); // still the 10th
    const marked = await billing.markOverdue(dhaka(2027, 2, 11, 0, 0));
    expect(marked).toBe(3); // A (unpaid), B (not yet confirmed), D (unpaid); C paid
    expect(await billing.markOverdue(dhaka(2027, 2, 12))).toBe(0); // idempotent
    for (const id of [storeA, storeB, storeD]) {
      const s = (await db.col.stores().findOne({ _id: id }))!;
      expect(s.status).toBe("suspended");
      expect(s.fee_suspension?.previous_status).toBe("approved");
    }
    expect((await db.col.stores().findOne({ _id: storeC }))!.status).toBe("approved");
    // hidden from buyers, data kept
    expect((await request(app).get(`/api/stores/${storeA}?university=diu`)).status).toBe(404);
    expect(await db.col.products().countDocuments({ store_id: storeA })).toBe(5);
    expect(await db.col.notifications().countDocuments({ kind: "platform_fee_overdue" })).toBe(3);
    // the suspended seller still opens payments and can pay
    const view = await sA.get("/api/seller/payments");
    expect(view.status).toBe(200);
    expect(view.body).toMatchObject({ store_status: "suspended", fee_suspended: true });
    expect(view.body.invoices[0]).toMatchObject({ display_status: "overdue", overdue: true });
    const r = await post(sA, "/api/seller/payments", {
      type: "platform_fee",
      invoice_id: inv[storeA]!.id,
      method: "bkash",
      sender_phone: "01612345678",
      trx_id: "BKA500PAID",
      amount: 500,
      confirmed: true,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const overview = await admin.get("/api/admin/payments/overview");
    const rowA = overview.body.stores.find((s: { store_id: string }) => s.store_id === storeA);
    expect(rowA).toMatchObject({
      fee_suspended: true,
      store_status: "suspended",
      payment_status: "submitted",
    });
    // confirm → A comes back automatically
    expect(
      (
        await post(admin, `/api/admin/payments/submissions/${r.body.id}/confirm`, {
          verified_amount: 500,
        })
      ).status,
    ).toBe(200);
    const a = (await db.col.stores().findOne({ _id: storeA }))!;
    expect(a.status).toBe("approved");
    expect(a.fee_suspension).toBeUndefined();
    expect((await request(app).get(`/api/stores/${storeA}?university=diu`)).status).toBe(200);
    // B's corrected payment confirmed → B back too
    expect(
      (
        await post(admin, `/api/admin/payments/submissions/${subB}/confirm`, {
          verified_amount: 250,
        })
      ).status,
    ).toBe(200);
    expect((await db.col.stores().findOne({ _id: storeB }))!.status).toBe("approved");
  });

  it("a store an admin unpublished by hand is not re-published by a fee payment", async () => {
    let r = await post(admin, `/api/admin/payments/stores/${storeD}/publication`, {
      action: "suspend",
      note: "x",
    });
    expect(r.status).toBe(400); // already unpublished (for the fee)
    r = await post(admin, `/api/admin/payments/stores/${storeD}/publication`, {
      action: "republish",
      note: "Checked with seller",
    });
    expect(r.status).toBe(200);
    r = await post(admin, `/api/admin/payments/stores/${storeD}/publication`, {
      action: "suspend",
      note: "Policy review",
    });
    expect(r.status).toBe(200);
    expect((await db.col.stores().findOne({ _id: storeD }))!.fee_suspension).toBeUndefined();
    r = await post(sD, "/api/seller/payments", {
      type: "platform_fee",
      invoice_id: inv[storeD]!.id,
      method: "bkash",
      sender_phone: "01512345678",
      trx_id: "DDDD50TAKA",
      amount: 50,
      confirmed: true,
    });
    expect(r.status).toBe(201);
    expect(
      (
        await post(admin, `/api/admin/payments/submissions/${r.body.id}/confirm`, {
          verified_amount: 50,
        })
      ).status,
    ).toBe(200);
    expect((await db.col.invoices().findOne({ _id: inv[storeD]!.id }))!.status).toBe("paid");
    expect((await db.col.stores().findOne({ _id: storeD }))!.status).toBe("suspended"); // admin's call stands
    const log = await admin.get(`/api/admin/payments/audit?store_id=${storeD}`);
    const actions = log.body.map((a: { action: string }) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "auto_suspend_unpaid_fee",
        "manual_republish",
        "manual_suspend",
        "confirm_payment",
      ]),
    );
  });

  it("admin month view: December 2026 sales shown but free; January billed", async () => {
    let r = await admin.get(`/api/admin/payments/stores/${storeD}/month?month=2026-12`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ billable: false, eligible_sales: 5000, fee: 0, invoice: null });
    r = await admin.get(`/api/admin/payments/stores/${storeA}/month?month=2027-01`);
    expect(r.body).toMatchObject({ billable: true, eligible_sales: 10000, fee: 500 });
    expect(r.body.invoice.status).toBe("paid");
    expect((await sA.get(`/api/admin/payments/stores/${storeA}/month?month=2027-01`)).status).toBe(
      403,
    );
    const detail = await admin.get(`/api/admin/payments/stores/${storeA}`);
    expect(detail.status).toBe(200);
    expect(detail.body.invoices).toHaveLength(1);
    expect(detail.body.submissions[0]).toMatchObject({ status: "confirmed", verified_amount: 500 });
  });

  // ---- Featured promotions ----------------------------------------------------------

  async function buyPromotion(a: Agent, pkg: string, ids: string[], trx: string, amount: number) {
    let r = await post(a, "/api/seller/promotions", { package_id: pkg, product_ids: ids });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const promoId = r.body.id as string;
    r = await post(a, "/api/seller/payments", {
      type: "promotion",
      promotion_id: promoId,
      method: "nagad",
      sender_phone: "01312345678",
      trx_id: trx,
      amount,
      confirmed: true,
      price: 1, // ignored
    });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.expected_amount).toBe(amount);
    return { promoId, subId: r.body.id as string };
  }

  it("enforces package limits and product ownership on the server", async () => {
    let r = await post(sA, "/api/seller/promotions", {
      package_id: "starter",
      product_ids: productsA.slice(0, 4),
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/up to 3 products/);
    r = await post(sA, "/api/seller/promotions", {
      package_id: "starter",
      product_ids: [productsA[0], productB],
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/own store/);
    r = await post(sA, "/api/seller/promotions", {
      package_id: "mega",
      product_ids: [productsA[0]],
    });
    expect(r.status).toBe(400);
  });

  let starter: { promoId: string; subId: string }, growth: { promoId: string; subId: string };

  it("a promotion starts only when the admin confirms, for exactly 72 hours", async () => {
    starter = await buyPromotion(sA, "starter", productsA.slice(0, 3), "PROMO3DAYS", 39);
    let p = (await db.col.promotions().findOne({ _id: starter.promoId }))!;
    expect(p).toMatchObject({
      status: "payment_submitted",
      price: 39,
      duration_hours: 72,
      starts_at: null,
    });
    let products = await request(app).get("/api/products?university=diu");
    const featured = () =>
      products.body
        .filter(
          (x: { featured_university_slug: string | null }) => x.featured_university_slug === "diu",
        )
        .map((x: { id: string }) => x.id);
    expect(featured()).toEqual([]); // not before confirmation

    const before = Date.now();
    const r = await post(admin, `/api/admin/payments/submissions/${starter.subId}/confirm`, {
      verified_amount: 39,
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    p = (await db.col.promotions().findOne({ _id: starter.promoId }))!;
    expect(p.status).toBe("active");
    expect(p.starts_at!.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(p.expires_at!.getTime() - p.starts_at!.getTime()).toBe(72 * 3600_000);

    products = await request(app).get("/api/products?university=diu");
    expect(featured().sort()).toEqual(productsA.slice(0, 3).sort());
    const stores = await request(app).get("/api/stores/featured?university=diu");
    expect(stores.body.map((s: { id: string }) => s.id)).toContain(storeA);
  });

  it("a second promotion queues after the first instead of shortening it (168 h)", async () => {
    growth = await buyPromotion(sA, "growth", productsA.slice(2, 5), "PROMO7DAYS", 79);
    expect(
      (
        await post(admin, `/api/admin/payments/submissions/${growth.subId}/confirm`, {
          verified_amount: 79,
        })
      ).status,
    ).toBe(200);
    const first = (await db.col.promotions().findOne({ _id: starter.promoId }))!;
    const second = (await db.col.promotions().findOne({ _id: growth.promoId }))!;
    expect(second.starts_at!.getTime()).toBe(first.expires_at!.getTime());
    expect(second.expires_at!.getTime() - second.starts_at!.getTime()).toBe(168 * 3600_000);
    expect(first.expires_at!.getTime() - first.starts_at!.getTime()).toBe(72 * 3600_000); // untouched
    const view = await sA.get("/api/seller/payments");
    const states = Object.fromEntries(
      view.body.promotions.map((p: { id: string; live_state: string }) => [p.id, p.live_state]),
    );
    expect(states[starter.promoId]).toBe("live");
    expect(states[growth.promoId]).toBe("scheduled");
  });

  it("15-day and 30-day packages run 360 h and 720 h", async () => {
    const premium = await buyPromotion(sC, "premium", [productsC[0]!], "PROMO15DAY", 149);
    expect(
      (
        await post(admin, `/api/admin/payments/submissions/${premium.subId}/confirm`, {
          verified_amount: 149,
        })
      ).status,
    ).toBe(200);
    const business = await buyPromotion(sC, "business", productsC, "PROMO30DAY", 249);
    expect(
      (
        await post(admin, `/api/admin/payments/submissions/${business.subId}/confirm`, {
          verified_amount: 249,
        })
      ).status,
    ).toBe(200);
    const p = (await db.col.promotions().findOne({ _id: premium.promoId }))!;
    const b = (await db.col.promotions().findOne({ _id: business.promoId }))!;
    expect(p.expires_at!.getTime() - p.starts_at!.getTime()).toBe(360 * 3600_000);
    expect(b.expires_at!.getTime() - b.starts_at!.getTime()).toBe(720 * 3600_000);
    expect(b.starts_at!.getTime()).toBe(p.expires_at!.getTime());
  });

  it("a rejected promotion payment never activates; the seller can pay again", async () => {
    const { promoId, subId } = await buyPromotion(sB, "starter", [productB], "WRONGTRX01", 39);
    expect(
      (
        await post(admin, `/api/admin/payments/submissions/${subId}/reject`, {
          reason: "No such transaction",
        })
      ).status,
    ).toBe(200);
    expect((await db.col.promotions().findOne({ _id: promoId }))!.status).toBe("payment_rejected");
    const r = await post(sB, "/api/seller/payments", {
      type: "promotion",
      promotion_id: promoId,
      method: "bkash",
      sender_phone: "01312345678",
      trx_id: "RIGHTTRX01",
      amount: 39,
      confirmed: true,
    });
    expect(r.status).toBe(201);
    expect((await db.col.promotions().findOne({ _id: promoId }))!.status).toBe("payment_submitted");
  });

  it("expired promotions stop featuring on their own and products return to normal", async () => {
    // Move A's promotions into the past: reads stop featuring them at expires_at…
    const past = new Date(Date.now() - 1000);
    await db.col
      .promotions()
      .updateMany(
        { store_id: storeA },
        { $set: { starts_at: new Date(past.getTime() - 3600_000), expires_at: past } },
      );
    const products = await request(app).get("/api/products?university=diu");
    const aFeatured = products.body.filter(
      (x: { store_id: string; featured_university_slug: string | null }) =>
        x.store_id === storeA && x.featured_university_slug === "diu",
    );
    expect(aFeatured).toHaveLength(0);
    const stores = await request(app).get("/api/stores/featured?university=diu");
    expect(stores.body.map((s: { id: string }) => s.id)).not.toContain(storeA);
    // …and the daily job records them as expired, without touching products or stores.
    expect(await billing.expirePromotions(new Date())).toBe(2);
    expect(await db.col.promotions().countDocuments({ store_id: storeA, status: "expired" })).toBe(
      2,
    );
    expect(await db.col.products().countDocuments({ store_id: storeA })).toBe(5);
    expect((await db.col.stores().findOne({ _id: storeA }))!.status).toBe("approved");
  });

  it("the billing cron is protected and idempotent", async () => {
    expect((await request(app).get("/api/cron/billing")).status).toBe(401);
    const r = await request(app)
      .get("/api/cron/billing")
      .set("authorization", "Bearer cron-secret-for-tests-123");
    expect(r.status).toBe(200);
    expect(await db.col.invoices().countDocuments({})).toBe(4);
  });

  it("admin overview lists every store with its payment state and filters' data", async () => {
    const r = await admin.get("/api/admin/payments/overview");
    expect(r.status).toBe(200);
    expect(r.body.stores).toHaveLength(4);
    const c = r.body.stores.find((s: { store_id: string }) => s.store_id === storeC);
    expect(c.active_promotion?.package_name).toBe("Premium Boost");
    expect(c.last_payment_at).toBeTruthy();
    expect(r.body.pending_count).toBe(1); // B's resubmitted promotion payment
  });
});
