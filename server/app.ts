import express, { type NextFunction, type Request, type Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { createHash, timingSafeEqual } from "node:crypto";
import { getAuth, trustedOrigins } from "./lib/auth";
import { getCloudinaryConfig } from "./lib/cloudinary";
import { ensureIndexes, getDb } from "./lib/db";
import { getGmailConfig } from "./lib/gmail";
import { errorHandler } from "./lib/http";
import { UNIVERSITIES } from "../shared/universities";
import { processEmailOutbox } from "./lib/outbox";
import { accountRouter } from "./routes/account";
import { adminRouter } from "./routes/admin";
import { chatRouter } from "./routes/chat";
import { ordersRouter } from "./routes/orders";
import { publicRouter } from "./routes/public";
import { sellerRouter } from "./routes/seller";

function cronAuthorized(req: Request): boolean {
  const secret = process.env["CRON_SECRET"];
  if (!secret || secret.length < 16) return false;
  const token = /^Bearer ([^\s,]+)$/.exec(req.headers.authorization ?? "")?.[1];
  if (!token) return false;
  const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
  return timingSafeEqual(digest(token), digest(secret));
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use((_req, res, next) => {
    res.set("x-content-type-options", "nosniff");
    res.set("referrer-policy", "strict-origin-when-cross-origin");
    next();
  });

  // Create indexes lazily on the first request of each instance.
  // Health/config check — no database needed, reports only yes/no flags (never values).
  app.get("/api/health", async (_req, res) => {
    let db = "not_configured";
    if (process.env["MONGODB_URI"]) {
      try {
        await Promise.race([
          getDb().command({ ping: 1 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
        ]);
        db = "ok";
      } catch {
        db = "unreachable";
      }
    }
    res.set("cache-control", "no-store").json({
      ok: db === "ok",
      db,
      authSecret: process.env["BETTER_AUTH_SECRET"] ? "explicit" : "derived",
      siteUrl: Boolean(process.env["SITE_URL"]),
      cloudinary: getCloudinaryConfig() !== null,
      gmail: getGmailConfig() !== null,
      cron: (process.env["CRON_SECRET"] ?? "").length >= 16,
      admins: (process.env["ADMIN_EMAILS"] ?? "").split(",").filter((e) => e.trim()).length,
    });
  });

  // Static data — no database needed.
  app.get("/api/universities", (_req, res) => {
    res.set("cache-control", "public, max-age=300").json(UNIVERSITIES);
  });

  app.use("/api", async (_req: Request, res: Response, next: NextFunction) => {
    if (!process.env["MONGODB_URI"]) {
      return res.status(503).json({ error: "Service is not configured yet (database missing)." });
    }
    await ensureIndexes();
    return next();
  });

  // Better Auth must see the raw body, so it is mounted before express.json().
  app.all("/api/auth/*splat", (req, res) => toNodeHandler(getAuth())(req, res));

  app.use(express.json({ limit: "200kb" }));

  // CSRF defence in depth (cookies are also SameSite=Lax): browsers always send
  // Origin on cross-site mutations, so reject any that isn't ours.
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
    const origin = req.headers.origin;
    if (origin && !trustedOrigins().includes(origin)) {
      return res.status(403).json({ error: "Cross-site request blocked" });
    }
    return next();
  });
  app.use("/api", (_req, res, next) => {
    res.set("cache-control", "no-store");
    next();
  });

  const cron = async (req: Request, res: Response) => {
    if (!cronAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
    return res.json(await processEmailOutbox({ limit: 50 }));
  };
  app.get("/api/cron/order-emails", cron);
  app.post("/api/cron/order-emails", cron);

  app.use("/api", publicRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/seller", sellerRouter);
  app.use("/api", ordersRouter);
  app.use("/api", chatRouter);
  app.use("/api", accountRouter);

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);
  return app;
}
