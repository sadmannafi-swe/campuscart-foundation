/**
 * Better Auth, privacy and authorization tests against a real MongoDB.
 * Run with TEST_MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0 — skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { MongoClient } from "mongodb";

const MONGO = process.env["TEST_MONGODB_URI"];
const ORIGIN = "http://localhost:5173";

describe.skipIf(!MONGO)("Auth, privacy and authorization", () => {
  let client: MongoClient;
  let app: import("express").Express;
  const dbName = `cc_auth_${Date.now()}`;
  const mails: Array<{ to: string; body: string }> = [];
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    Object.assign(process.env, {
      CLOUDINARY_URL: "cloudinary://key:secret@testcloud",
      ADMIN_EMAILS: "boss@diu.edu.bd",
      GMAIL_CLIENT_ID: "id",
      GMAIL_CLIENT_SECRET: "s",
      GMAIL_REFRESH_TOKEN: "r",
      GMAIL_SENDER: "shop@gmail.com",
    });
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (String(url).includes("oauth2.googleapis.com"))
        return Response.json({ access_token: "t", expires_in: 3600 });
      if (String(url).includes("gmail.googleapis.com")) {
        const raw = Buffer.from(JSON.parse(String(init?.body)).raw, "base64url").toString("utf8");
        const to = /To: <([^>]+)>/.exec(raw)?.[1] ?? "";
        const parts = [...raw.matchAll(/base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n--/g)].map((m) =>
          Buffer.from(m[1]!.replace(/\r\n/g, ""), "base64").toString("utf8"),
        );
        mails.push({ to, body: parts.join("\n") });
        return Response.json({ id: "m" });
      }
      return realFetch(url, init);
    });
    process.env["MONGODB_URI"] ??= MONGO;
    client = new MongoClient(MONGO!);
    await client.connect();
    const db = await import("./lib/db");
    db.setDbForTests(client, dbName);
    (await import("./lib/auth")).resetAuthForTests();
    app = (await import("./app")).createApp();
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    for (const k of [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
      "GMAIL_SENDER",
    ])
      delete process.env[k];
    await client.db(dbName).dropDatabase();
    await client.close();
  });

  const users = () => client.db(dbName).collection("user");
  const post = (a: ReturnType<typeof request.agent>, url: string, body: object = {}) =>
    a.post(url).set("origin", ORIGIN).send(body);

  it("rejects or ignores privileged fields smuggled into sign-up", async () => {
    const a = request.agent(app);
    const withRole = await post(a, "/api/auth/sign-up/email", {
      email: "evil@diu.edu.bd",
      password: "password123",
      name: "Evil",
      role: "admin",
    });
    expect(withRole.status).toBe(400);
    expect(await users().findOne({ email: "evil@diu.edu.bd" })).toBeNull();

    const r = await post(a, "/api/auth/sign-up/email", {
      email: "evil@diu.edu.bd",
      password: "password123",
      name: "Evil",
      emailVerified: true,
      studentId: "111-11-1111",
    });
    expect(r.status).toBe(200);
    const u = await users().findOne({ email: "evil@diu.edu.bd" });
    expect(u?.["role"]).toBe("user");
    expect(u?.["emailVerified"]).toBe(false);
    expect(
      (
        await post(a, "/api/auth/sign-up/email", {
          email: "evil2@diu.edu.bd",
          password: "password123",
          name: "E",
          avatarId: "x",
        })
      ).status,
    ).toBe(400);
    expect((await a.get("/api/admin/access")).status).toBe(403);
    expect((await a.get("/api/auth/admin/list-users")).status).toBeGreaterThanOrEqual(401);
  });

  it("locks student ID, role and image against /update-user", async () => {
    const a = request.agent(app);
    await post(a, "/api/auth/sign-up/email", {
      email: "u1@diu.edu.bd",
      password: "password123",
      name: "U One",
      studentId: "221-15-0101",
    });
    expect((await post(a, "/api/auth/update-user", { role: "admin" })).status).toBe(400);
    expect(
      (await post(a, "/api/auth/update-user", { avatarId: "campuscart/avatar/x/y" })).status,
    ).toBe(400);
    expect((await post(a, "/api/auth/update-user", { studentId: "999" })).status).toBe(400);
    expect(
      (await post(a, "/api/auth/update-user", { image: "https://evil.example/x.png" })).status,
    ).toBe(400);
    const r = await post(a, "/api/auth/update-user", { phone: "01799999999" });
    expect(r.status).toBe(200);
    const u = await users().findOne({ email: "u1@diu.edu.bd" });
    expect(u).toMatchObject({ studentId: "221-15-0101", role: "user", phone: "01799999999" });
    expect(u?.["image"] ?? null).toBeNull();
  });

  it("sends a sign-up verification e-mail when Gmail is configured", () => {
    expect(mails.some((m) => m.to === "u1@diu.edu.bd" && /verify-email\?token=/.test(m.body))).toBe(
      true,
    );
  });

  it("resets a password end-to-end from the e-mailed link and revokes old sessions", async () => {
    const a = request.agent(app);
    await post(a, "/api/auth/sign-up/email", {
      email: "reset@diu.edu.bd",
      password: "password123",
      name: "Reset Me",
    });
    expect((await a.get("/api/me")).status).toBe(200);

    // Open-redirect attempt is refused.
    const evil = await post(request.agent(app), "/api/auth/request-password-reset", {
      email: "reset@diu.edu.bd",
      redirectTo: "https://evil.example/steal",
    });
    expect(evil.status).toBe(403);

    mails.length = 0;
    const r = await post(request.agent(app), "/api/auth/request-password-reset", {
      email: "reset@diu.edu.bd",
      redirectTo: `${ORIGIN}/reset-password`,
    });
    expect(r.status).toBe(200);
    const mail = mails.find((m) => m.to === "reset@diu.edu.bd");
    const link = /https?:\/\/[^\s"<]+\/api\/auth\/reset-password\/[^\s"<]+/.exec(
      mail?.body ?? "",
    )?.[0];
    expect(link).toBeTruthy();
    const hop = await request(app).get(
      new URL(link!.replace(/&amp;/g, "&")).pathname + new URL(link!.replace(/&amp;/g, "&")).search,
    );
    expect(hop.status).toBe(302);
    const back = new URL(hop.headers["location"]!);
    expect(back.origin + back.pathname).toBe(`${ORIGIN}/reset-password`);
    const token = back.searchParams.get("token");
    expect(token).toBeTruthy();

    expect(
      (
        await post(request.agent(app), "/api/auth/reset-password", {
          newPassword: "newpassword456",
          token,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await post(request.agent(app), "/api/auth/reset-password", {
          newPassword: "again789000",
          token,
        })
      ).status,
    ).toBe(400);
    expect((await a.get("/api/me")).status).toBe(401); // old session revoked
    expect(
      (
        await post(request.agent(app), "/api/auth/sign-in/email", {
          email: "reset@diu.edu.bd",
          password: "password123",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await post(request.agent(app), "/api/auth/sign-in/email", {
          email: "reset@diu.edu.bd",
          password: "newpassword456",
        })
      ).status,
    ).toBe(200);
    // Unknown e-mail: same response, nothing sent (no account enumeration).
    mails.length = 0;
    expect(
      (
        await post(request.agent(app), "/api/auth/request-password-reset", {
          email: "nobody@diu.edu.bd",
          redirectTo: `${ORIGIN}/reset-password`,
        })
      ).status,
    ).toBe(200);
    expect(mails).toHaveLength(0);
  });

  it("issues HttpOnly SameSite=Lax session cookies (Secure in production)", async () => {
    const r = await post(request.agent(app), "/api/auth/sign-in/email", {
      email: "u1@diu.edu.bd",
      password: "password123",
    });
    const cookie = ([] as string[])
      .concat(r.headers["set-cookie"] ?? [])
      .find((c) => c.includes("session_token"))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const env = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";
    process.env["SITE_URL"] = "https://campuscart.example";
    try {
      (await import("./lib/auth")).resetAuthForTests();
      const prodApp = (await import("./app")).createApp();
      const pr = await request(prodApp)
        .post("/api/auth/sign-in/email")
        .set("origin", "https://campuscart.example")
        .send({ email: "u1@diu.edu.bd", password: "password123" });
      const pc = ([] as string[])
        .concat(pr.headers["set-cookie"] ?? [])
        .find((c) => c.includes("session_token"))!;
      expect(pc).toMatch(/__Secure-/);
      expect(pc).toMatch(/;\s*Secure/i);
      // Untrusted origins are refused by both Better Auth and the API.
      const bad = await request(prodApp)
        .post("/api/auth/sign-in/email")
        .set("origin", "http://localhost:5173")
        .send({ email: "u1@diu.edu.bd", password: "password123" });
      expect(bad.status).toBe(403);
    } finally {
      process.env["NODE_ENV"] = env;
      delete process.env["SITE_URL"];
      (await import("./lib/auth")).resetAuthForTests();
    }
  });

  it("keeps profile photos private and owner-scoped", async () => {
    const a = request.agent(app);
    await post(a, "/api/auth/sign-in/email", { email: "u1@diu.edu.bd", password: "password123" });
    const me = (await a.get("/api/me")).body;
    expect(
      (
        await a
          .patch("/api/me")
          .set("origin", ORIGIN)
          .send({ avatar_id: "campuscart/avatar/someone-else/p" })
      ).status,
    ).toBe(400);
    expect(
      (
        await a
          .patch("/api/me")
          .set("origin", ORIGIN)
          .send({ avatar_id: `campuscart/avatar/${me.id}/../student-id/x` })
      ).status,
    ).toBe(400);
    expect(
      (
        await a
          .patch("/api/me")
          .set("origin", ORIGIN)
          .send({ avatar_id: `campuscart/avatar/${me.id}/photo` })
      ).status,
    ).toBe(200);
    const after = (await a.get("/api/me")).body;
    expect(after.avatar_path).toMatch(
      /^https:\/\/res\.cloudinary\.com\/testcloud\/image\/authenticated\/s--/,
    );
    const sig = (await post(a, "/api/uploads/sign", { kind: "avatar" })).body;
    expect(sig.type).toBe("authenticated");
  });

  it("ADMIN_EMAILS only promotes the listed, verified address", async () => {
    const other = request.agent(app);
    await post(other, "/api/auth/sign-up/email", {
      email: "notboss@diu.edu.bd",
      password: "password123",
      name: "Not Boss",
    });
    await users().updateOne({ email: "notboss@diu.edu.bd" }, { $set: { emailVerified: true } });
    expect((await other.get("/api/admin/access")).status).toBe(403);

    const boss = request.agent(app);
    await post(boss, "/api/auth/sign-up/email", {
      email: "boss@diu.edu.bd",
      password: "password123",
      name: "Boss",
    });
    expect((await boss.get("/api/admin/access")).status).toBe(403); // unverified
    await users().updateOne({ email: "boss@diu.edu.bd" }, { $set: { emailVerified: true } });
    expect((await boss.get("/api/admin/access")).status).toBe(200);
    expect((await users().findOne({ email: "boss@diu.edu.bd" }))?.["role"]).toBe("admin");
    // Better Auth admin endpoints never return the private student ID.
    const list = await boss.get("/api/auth/admin/list-users");
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toContain("221-15-0101");
    expect(JSON.stringify(list.body)).not.toContain("studentId");
  });

  it("reports configuration without leaking values", async () => {
    const h = (await request(app).get("/api/health")).body;
    expect(h).toMatchObject({ gmail: true, cloudinary: true });
    expect(JSON.stringify(h)).not.toContain("secret");
    expect(JSON.stringify(h)).not.toContain("testcloud");
  });
});
