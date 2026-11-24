/**
 * Regression test for the 23 Nov 2026 production outage: the Atlas app user
 * (built-in `readWrite`) may not run `collMod`, so applying the module schema
 * validators threw on every cold start and every /api route answered 500 —
 * sign-in included. Validators are best-effort now; the API must keep working.
 * Run with TEST_MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0 — skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Db, MongoClient } from "mongodb";

const MONGO = process.env["TEST_MONGODB_URI"];
const ORIGIN = "http://localhost:5173";

describe.skipIf(!MONGO)("API without collMod permission (Atlas readWrite)", () => {
  let client: MongoClient;
  let app: import("express").Express;
  const dbName = `cc_perm_${Date.now()}`;
  let collModCalls = 0;

  beforeAll(async () => {
    process.env["MONGODB_URI"] ??= MONGO;
    client = new MongoClient(MONGO!);
    await client.connect();
    // Collections already exist, as they did in production, so the collMod path runs.
    for (const name of [
      "preowned_listings",
      "blood_requests",
      "donor_profiles",
      "bashalagbe_listings",
      "reports",
    ])
      await client.db(dbName).createCollection(name);
    // Existing marketplace data that must stay readable.
    await client
      .db(dbName)
      .collection("products")
      .insertOne({ _id: "keep-me" as never, name: "Existing product" });

    const realCommand = Db.prototype.command;
    vi.spyOn(Db.prototype, "command").mockImplementation(function (this: Db, cmd, opts) {
      if (cmd && "collMod" in cmd) {
        collModCalls++;
        const err = Object.assign(
          new Error(
            `user is not allowed to do action [collMod] on [${this.databaseName}.${cmd["collMod"]}]`,
          ),
          { code: 8000, codeName: "AtlasError" },
        );
        return Promise.reject(err);
      }
      return realCommand.call(this, cmd, opts);
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const db = await import("./lib/db");
    db.setDbForTests(client, dbName);
    const { createApp } = await import("./app");
    app = createApp();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await client.db(dbName).dropDatabase();
    await client.close();
  });

  it("serves public routes instead of 500", async () => {
    const r = await request(app).get("/api/products?university=diu");
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(collModCalls).toBeGreaterThan(0); // the forbidden path was really exercised
  });

  it("lets a user sign up, sign out and sign back in", async () => {
    const a = request.agent(app);
    const up = await a.post("/api/auth/sign-up/email").set("origin", ORIGIN).send({
      email: "seller@diu.edu.bd",
      password: "password123",
      name: "Seller",
      phone: "01700000000",
    });
    expect(up.status, JSON.stringify(up.body)).toBe(200);
    expect((await a.get("/api/auth/get-session")).body?.user?.email).toBe("seller@diu.edu.bd");
    expect((await a.post("/api/auth/sign-out").set("origin", ORIGIN).send({})).status).toBe(200);
    const b = request.agent(app);
    const inR = await b
      .post("/api/auth/sign-in/email")
      .set("origin", ORIGIN)
      .send({ email: "seller@diu.edu.bd", password: "password123" });
    expect(inR.status, JSON.stringify(inR.body)).toBe(200);
    expect((await b.get("/api/auth/get-session")).body?.user?.email).toBe("seller@diu.edu.bd");
  });

  it("never touches existing documents", async () => {
    expect(
      await client
        .db(dbName)
        .collection("products")
        .findOne({ _id: "keep-me" as never }),
    ).toMatchObject({ name: "Existing product" });
  });
});
