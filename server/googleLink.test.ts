/**
 * "Continue with Google" and e-mail/password must resolve to ONE CampusCart user.
 * Runs Better Auth's real OAuth routes (sign-in → callback → link) against MongoDB;
 * only Google's token endpoint is simulated, returning an ID token for `google`.
 * Run with TEST_MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0 — skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { MongoClient } from "mongodb";

const MONGO = process.env["TEST_MONGODB_URI"];
const ORIGIN = "http://localhost:5173";
type Agent = ReturnType<typeof request.agent>;

/** The Google identity the simulated token endpoint returns next. */
let google = { sub: "", email: "", name: "", email_verified: true };
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const idToken = () =>
  `${b64({ alg: "RS256", kid: "test" })}.${b64({
    iss: "https://accounts.google.com",
    aud: "test-client.apps.googleusercontent.com",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...google,
  })}.sig`;

describe.skipIf(!MONGO)("Google + e-mail/password account linking", () => {
  let client: MongoClient;
  let app: import("express").Express;
  const dbName = `cc_glink_${Date.now()}`;
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    Object.assign(process.env, {
      GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "test-secret",
    });
    vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).startsWith("https://oauth2.googleapis.com/token"))
        return Response.json({
          access_token: "google-access",
          id_token: idToken(),
          expires_in: 3600,
          token_type: "Bearer",
          scope: "openid email profile",
        });
      return realFetch(url as string, init);
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
    delete process.env["GOOGLE_CLIENT_ID"];
    delete process.env["GOOGLE_CLIENT_SECRET"];
    (await import("./lib/auth")).resetAuthForTests();
    await client.db(dbName).dropDatabase();
    await client.close();
  });

  const users = () => client.db(dbName).collection("user");
  const post = (a: Agent, url: string, body: object = {}) =>
    a.post(url).set("origin", ORIGIN).send(body);
  const sessionUserId = async (a: Agent) =>
    (await a.get("/api/auth/get-session")).body?.user?.id as string | undefined;

  /** Starts an OAuth flow (sign-in or link) and completes Google's callback. Returns the redirect. */
  async function viaGoogle(a: Agent, start: "/api/auth/sign-in/social" | "/api/auth/link-social") {
    const r = await post(a, start, {
      provider: "google",
      callbackURL: "/account",
      errorCallbackURL: "/auth?mode=login",
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const state = new URL(r.body.url).searchParams.get("state");
    const cb = await a.get(`/api/auth/callback/google?code=test-code&state=${state}`);
    expect(cb.status).toBe(302);
    return new URL(cb.headers["location"] as string, "http://localhost");
  }

  async function signUp(email: string, name: string) {
    const a = request.agent(app);
    const r = await post(a, "/api/auth/sign-up/email", {
      email,
      password: "password123",
      name,
      studentId: "221-15-4242",
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    return a;
  }
  const passwordLogin = async (email: string, password = "password123") => {
    const a = request.agent(app);
    const r = await post(a, "/api/auth/sign-in/email", { email, password });
    return { a, status: r.status };
  };

  it("e-mail/password first: Google sign-in does not silently take over an unverified account", async () => {
    await signUp("rina@diu.edu.bd", "Rina Akter");
    const original = await users().findOne({ email: "rina@diu.edu.bd" });
    expect(original?.["emailVerified"]).toBe(false); // no verification e-mail in this setup

    google = { sub: "g-rina", email: "rina@diu.edu.bd", name: "Rina A.", email_verified: true };
    const g = request.agent(app);
    const back = await viaGoogle(g, "/api/auth/sign-in/social");
    expect(back.pathname).toBe("/auth");
    expect(back.searchParams.get("error")).toBe("account_not_linked");
    expect(await sessionUserId(g)).toBeUndefined();
    expect(await users().countDocuments({ email: "rina@diu.edu.bd" })).toBe(1); // no duplicate
  });

  it("…after confirming the password once, Google is linked to the SAME user, and both methods keep working", async () => {
    const { a, status } = await passwordLogin("rina@diu.edu.bd");
    expect(status).toBe(200);
    const id = await sessionUserId(a);
    expect((await a.get("/api/me/sign-in-methods")).body).toEqual({
      password: true,
      google: false,
      google_available: true,
    });

    const back = await viaGoogle(a, "/api/auth/link-social");
    expect(back.pathname).toBe("/account");
    expect(back.searchParams.get("error")).toBeNull();
    expect((await a.get("/api/me/sign-in-methods")).body).toMatchObject({
      password: true,
      google: true,
    });

    // Google sign-in now lands on the same user, with the same private data
    const g = request.agent(app);
    const signedIn = await viaGoogle(g, "/api/auth/sign-in/social");
    expect(signedIn.pathname).toBe("/account");
    expect(await sessionUserId(g)).toBe(id);
    expect((await g.get("/api/me")).body).toMatchObject({
      id,
      email: "rina@diu.edu.bd",
      full_name: "Rina Akter",
      student_id: "221-15-4242",
    });
    // …and the password still works, again for the same user
    const again = await passwordLogin("rina@diu.edu.bd");
    expect(again.status).toBe(200);
    expect(await sessionUserId(again.a)).toBe(id);
    expect(await users().countDocuments({ email: "rina@diu.edu.bd" })).toBe(1);
  });

  it("linking refuses a Google account with a different e-mail", async () => {
    await signUp("karim@diu.edu.bd", "Karim");
    const { a } = await passwordLogin("karim@diu.edu.bd");
    google = { sub: "g-other", email: "someone.else@gmail.com", name: "X", email_verified: true };
    const back = await viaGoogle(a, "/api/auth/link-social");
    expect(back.searchParams.get("error")).toBeTruthy();
    expect((await a.get("/api/me/sign-in-methods")).body.google).toBe(false);
  });

  it("a Google account already linked to one user can't be linked to another", async () => {
    await signUp("sumi@diu.edu.bd", "Sumi");
    const { a } = await passwordLogin("sumi@diu.edu.bd");
    google = { sub: "g-rina", email: "sumi@diu.edu.bd", name: "Sumi", email_verified: true };
    const back = await viaGoogle(a, "/api/auth/link-social");
    expect(back.searchParams.get("error")).toBeTruthy();
    expect((await a.get("/api/me/sign-in-methods")).body.google).toBe(false);
  });

  it("Google first: the account is created verified; adding a password lets e-mail login reach the SAME user", async () => {
    google = { sub: "g-nabil", email: "nabil@diu.edu.bd", name: "Nabil", email_verified: true };
    const g = request.agent(app);
    const back = await viaGoogle(g, "/api/auth/sign-in/social");
    expect(back.pathname).toBe("/account");
    const id = await sessionUserId(g);
    expect(id).toBeTruthy();
    expect((await users().findOne({ email: "nabil@diu.edu.bd" }))?.["emailVerified"]).toBe(true);

    // no password yet: e-mail login fails
    expect((await passwordLogin("nabil@diu.edu.bd", "newpassword1")).status).toBe(401);
    expect((await g.get("/api/me/sign-in-methods")).body).toMatchObject({
      password: false,
      google: true,
    });
    expect((await post(g, "/api/me/password", { new_password: "short" })).status).toBe(400);
    const set = await post(g, "/api/me/password", { new_password: "newpassword1" });
    expect(set.status, JSON.stringify(set.body)).toBe(200);
    expect(set.body).toMatchObject({ password: true, google: true });
    // a second "set" can't overwrite it (changing a password needs the reset flow)
    expect((await post(g, "/api/me/password", { new_password: "hijacked123" })).status).toBe(400);

    const pw = await passwordLogin("nabil@diu.edu.bd", "newpassword1");
    expect(pw.status).toBe(200);
    expect(await sessionUserId(pw.a)).toBe(id);
    // Google again → same user
    const g2 = request.agent(app);
    await viaGoogle(g2, "/api/auth/sign-in/social");
    expect(await sessionUserId(g2)).toBe(id);
    expect(await users().countDocuments({ email: "nabil@diu.edu.bd" })).toBe(1);
  });

  it("an e-mail/password account whose e-mail is already verified links on Google sign-in directly", async () => {
    await signUp("tania@diu.edu.bd", "Tania");
    await users().updateOne({ email: "tania@diu.edu.bd" }, { $set: { emailVerified: true } });
    const { a } = await passwordLogin("tania@diu.edu.bd");
    const id = await sessionUserId(a);
    google = { sub: "g-tania", email: "tania@diu.edu.bd", name: "Tania", email_verified: true };
    const g = request.agent(app);
    expect((await viaGoogle(g, "/api/auth/sign-in/social")).pathname).toBe("/account");
    expect(await sessionUserId(g)).toBe(id);
  });

  it("set-password and sign-in methods require a session", async () => {
    const anon = request.agent(app);
    expect((await anon.get("/api/me/sign-in-methods")).status).toBe(401);
    expect((await post(anon, "/api/me/password", { new_password: "newpassword1" })).status).toBe(
      401,
    );
  });
});
