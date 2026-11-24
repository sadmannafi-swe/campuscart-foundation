/**
 * Phase-1 performance changes: CDN caching only on public marketplace reads,
 * read-first index setup, serverless pool settings and the Mumbai region.
 * The API parts run with TEST_MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Collection, MongoClient } from "mongodb";
import { PUBLIC_CDN_CACHE, STATIC_CDN_CACHE } from "./lib/http";
import { POOL_OPTIONS } from "./lib/db";

const MONGO = process.env["TEST_MONGODB_URI"];
const ORIGIN = "http://localhost:5173";
const root = path.resolve(__dirname, "..");

/** Every route that may be cached by the CDN. Anything else must stay no-store. */
const CACHEABLE = [
  "/api/universities",
  "/api/products?university=diu",
  "/api/stores?university=diu",
  "/api/stores/featured?university=diu",
];

describe("CDN cache policy (static checks)", () => {
  it("public cache headers never let browsers or the CDN keep data for long", () => {
    expect(PUBLIC_CDN_CACHE).toMatch(/^public, max-age=0, s-maxage=30, stale-while-revalidate=60$/);
    expect(STATIC_CDN_CACHE).toContain("s-maxage=3600");
  });

  it("only the public router and the static universities route opt into CDN caching", () => {
    const files = readdirSync(path.join(root, "server/routes")).filter((f) => f.endsWith(".ts"));
    const users = files.filter((f) =>
      /PUBLIC_CDN_CACHE|STATIC_CDN_CACHE|s-maxage|"public,/.test(
        readFileSync(path.join(root, "server/routes", f), "utf8"),
      ),
    );
    expect(users).toEqual(["public.ts"]);
    const publicSrc = readFileSync(path.join(root, "server/routes/public.ts"), "utf8");
    // The public router must never look at who is asking.
    expect(publicSrc).not.toMatch(/\bme\(|optionalUser|getSession|headers\.cookie|authorization/i);
  });
});

describe("serverless pool settings", () => {
  it("uses a small pool that closes idle connections", () => {
    expect(POOL_OPTIONS.maxPoolSize).toBeLessThanOrEqual(5);
    expect(POOL_OPTIONS.minPoolSize).toBe(0);
    expect(POOL_OPTIONS.maxIdleTimeMS).toBeGreaterThan(0);
    const c = new MongoClient("mongodb://127.0.0.1:1", POOL_OPTIONS);
    expect(c.options.maxPoolSize).toBe(POOL_OPTIONS.maxPoolSize);
    expect(c.options.maxIdleTimeMS).toBe(POOL_OPTIONS.maxIdleTimeMS);
  });
});

describe("function region", () => {
  it("runs the API in Mumbai (bom1), next to the Atlas cluster", () => {
    const vercel = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"));
    expect(vercel.regions).toEqual(["bom1"]);
    const build = readFileSync(path.join(root, "scripts/build-vercel.mjs"), "utf8");
    expect(build).toContain('const FUNCTION_REGION = "bom1"');
    expect(build).toContain("regions: [FUNCTION_REGION]");
  });
});

describe.skipIf(!MONGO)("cache headers and index setup against MongoDB", () => {
  let client: MongoClient;
  let app: import("express").Express;
  let db: typeof import("./lib/db");
  const dbName = `cc_perf_${Date.now()}`;

  beforeAll(async () => {
    process.env["MONGODB_URI"] ??= MONGO;
    process.env["CLOUDINARY_URL"] = "cloudinary://key:secret@testcloud";
    process.env["ADMIN_EMAILS"] = "admin@diu.edu.bd";
    client = new MongoClient(MONGO!);
    await client.connect();
    db = await import("./lib/db");
    db.setDbForTests(client, dbName);
    const { createApp } = await import("./app");
    app = createApp();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await client.db(dbName).dropDatabase();
    await client.close();
  });

  async function signedIn(email: string, extraSetup?: (a: request.Agent) => Promise<void>) {
    const a = request.agent(app);
    const r = await a
      .post("/api/auth/sign-up/email")
      .set("origin", ORIGIN)
      .send({ email, password: "password123", name: "Test User", phone: "01700000000" });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    if (extraSetup) await extraSetup(a);
    return a;
  }

  it("creates every index on an empty database", async () => {
    await db.ensureIndexes();
    expect(await db.missingIndexes()).toEqual([]);
  });

  it("writes nothing on a later cold start when the indexes already exist", async () => {
    db.setDbForTests(client, dbName); // a fresh instance: the per-process flag is reset
    const createIndex = vi.spyOn(Collection.prototype, "createIndex");
    await db.ensureIndexes();
    expect(createIndex).not.toHaveBeenCalled();
    createIndex.mockRestore();
  });

  it("creates only an index that went missing", async () => {
    await client.db(dbName).collection("products").dropIndex("is_active_1_created_at_-1");
    db.setDbForTests(client, dbName);
    const createIndex = vi.spyOn(Collection.prototype, "createIndex");
    await db.ensureIndexes();
    expect(createIndex).toHaveBeenCalledTimes(1);
    createIndex.mockRestore();
    expect(await db.missingIndexes()).toEqual([]);
  });

  it("public marketplace reads are CDN-cacheable, identical for everyone, and set no cookie", async () => {
    const user = await signedIn("buyer-cache@diu.edu.bd");
    for (const url of CACHEABLE) {
      const anon = await request(app).get(url);
      const auth = await user.get(url);
      expect(anon.status, url).toBe(200);
      expect(anon.headers["cache-control"], url).toMatch(/s-maxage=/);
      expect(anon.headers["set-cookie"], url).toBeUndefined();
      expect(auth.headers["set-cookie"], url).toBeUndefined();
      expect(auth.body, url).toEqual(anon.body);
    }
  });

  it("public error responses are not cached", async () => {
    const r = await request(app).get("/api/stores/does-not-exist?university=diu");
    expect(r.status).toBe(404);
    expect(r.headers["cache-control"]).toBe("no-store");
    const bad = await request(app).get("/api/products?university=nowhere");
    expect(bad.status).toBe(400);
    expect(bad.headers["cache-control"]).toBe("no-store");
  });

  it("a failure after the cache header was set is still answered no-store", async () => {
    const find = vi.spyOn(Collection.prototype, "find").mockImplementationOnce(() => {
      throw new Error("simulated database failure");
    });
    vi.spyOn(console, "error").mockImplementationOnce(() => {});
    const products = await request(app).get("/api/products?university=diu");
    find.mockRestore();
    expect(products.status).toBe(500);
    expect(products.headers["cache-control"]).toBe("no-store");
  });

  it("private, personalised and module routes stay no-store", async () => {
    const user = await signedIn("private-cache@diu.edu.bd");
    const privateRoutes = [
      "/api/auth/get-session",
      "/api/me",
      "/api/me/reviews",
      "/api/orders",
      "/api/notifications",
      "/api/chat/conversations",
      "/api/chat/unread",
      "/api/seller/account",
      "/api/seller/orders",
      "/api/seller/products",
      "/api/admin/orders",
      "/api/seller/earnings",
      "/api/seller/reviews",
      "/api/preowned?university=diu",
      "/api/preowned/mine",
      "/api/blood/requests?university=diu",
      "/api/blood/donors?university=diu",
      "/api/blood/donors/me",
      "/api/basha?university=diu",
      "/api/basha/mine",
      "/api/search?q=a&university=diu",
    ];
    for (const url of privateRoutes) {
      const r = await user.get(url);
      expect(r.status, `${url} must be a real route`).not.toBe(404);
      const cc = String(r.headers["cache-control"] ?? "");
      expect(cc, `${url} (${r.status})`).not.toMatch(/s-maxage|public/);
    }
  });
});
