/**
 * Rate limiting and account lockout (real MongoDB, limiter enabled).
 * Run with TEST_MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0 — skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoClient } from "mongodb";

const MONGO = process.env["TEST_MONGODB_URI"];
const ORIGIN = "http://localhost:5173";

describe.skipIf(!MONGO)("Campus-friendly rate limits + account lockout", () => {
  let client: MongoClient;
  let app: import("express").Express;
  const dbName = `cc_rl_${Date.now()}`;

  beforeAll(async () => {
    process.env["MONGODB_URI"] ??= MONGO;
    process.env["RATE_LIMIT_IN_TESTS"] = "true";
    delete process.env["GMAIL_CLIENT_ID"];
    client = new MongoClient(MONGO!);
    await client.connect();
    (await import("./lib/db")).setDbForTests(client, dbName);
    (await import("./lib/auth")).resetAuthForTests();
    app = (await import("./app")).createApp();
  });

  afterAll(async () => {
    delete process.env["RATE_LIMIT_IN_TESTS"];
    (await import("./lib/auth")).resetAuthForTests();
    await client.db(dbName).dropDatabase();
    await client.close();
  });

  const send = (path: string, body: object, ip: string) =>
    request(app).post(path).set("origin", ORIGIN).set("x-real-ip", ip).send(body);
  const signUp = (email: string, ip: string) =>
    send(
      "/api/auth/sign-up/email",
      { email, password: "password123", name: email.split("@")[0] },
      ip,
    );
  const signIn = (email: string, password: string, ip: string) =>
    send("/api/auth/sign-in/email", { email, password }, ip);

  it("lets many students on the same campus IP sign up and sign in", async () => {
    const campusIp = "203.0.113.10";
    for (let i = 0; i < 12; i++)
      expect((await signUp(`student${i}@diu.edu.bd`, campusIp)).status).toBe(200);
    for (let i = 0; i < 12; i++) {
      expect((await signIn(`student${i}@diu.edu.bd`, "password123", campusIp)).status).toBe(200);
    }
  });

  it("still caps sign-in attempts per IP", async () => {
    const ip = "198.51.100.7";
    const statuses: number[] = [];
    for (let i = 0; i < 61; i++)
      statuses.push((await signIn(`ghost${i}@x.edu`, "wrongpass1", ip)).status);
    expect(statuses.slice(0, 60).every((s) => s === 401)).toBe(true);
    expect(statuses[60]).toBe(429);
    // another IP is unaffected
    expect((await signIn("student0@diu.edu.bd", "password123", "198.51.100.8")).status).toBe(200);
  });

  it("locks one account after repeated wrong passwords — from any IP — without affecting others", async () => {
    await signUp("alice@diu.edu.bd", "192.0.2.1");
    for (let i = 0; i < 8; i++) {
      expect((await signIn("alice@diu.edu.bd", "wrongpass1", `192.0.2.${10 + i}`)).status).toBe(
        401,
      );
    }
    const locked = await signIn("alice@diu.edu.bd", "password123", "192.0.2.99");
    expect(locked.status).toBe(429);
    expect(locked.body.message).toMatch(/Too many failed sign-in attempts for this account/);
    // a classmate on the same IP is fine
    expect((await signIn("student1@diu.edu.bd", "password123", "192.0.2.99")).status).toBe(200);
    // once the lock expires, the right password works and clears the counter
    await client
      .db(dbName)
      .collection("auth_attempts")
      .updateOne(
        { _id: "alice@diu.edu.bd" as never },
        { $set: { locked_until: new Date(Date.now() - 1000) } },
      );
    expect((await signIn("alice@diu.edu.bd", "password123", "192.0.2.100")).status).toBe(200);
    const doc = await client
      .db(dbName)
      .collection("auth_attempts")
      .findOne({ _id: "alice@diu.edu.bd" as never });
    expect(doc?.["failures"]).toBe(0);
  });

  it("a successful sign-in resets earlier failures", async () => {
    await signUp("bob@diu.edu.bd", "192.0.2.50");
    for (let i = 0; i < 5; i++) await signIn("bob@diu.edu.bd", "wrongpass1", "192.0.2.51");
    expect((await signIn("bob@diu.edu.bd", "password123", "192.0.2.51")).status).toBe(200);
    for (let i = 0; i < 5; i++) await signIn("bob@diu.edu.bd", "wrongpass1", "192.0.2.52");
    expect((await signIn("bob@diu.edu.bd", "password123", "192.0.2.52")).status).toBe(200);
  });

  it("limits password-reset e-mails per address", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push(
        (
          await send(
            "/api/auth/request-password-reset",
            { email: "student2@diu.edu.bd", redirectTo: `${ORIGIN}/reset-password` },
            `192.0.2.${150 + i}`,
          )
        ).status,
      );
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });
});
