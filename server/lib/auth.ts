import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import { renderPasswordResetEmail, renderVerifyEmail } from "../../shared/email/authEmails";
import { getClient, getDb } from "./db";
import { isMailConfigured, sendMail, siteUrl } from "./mailer";

export function trustedOrigins(): string[] {
  const list = [siteUrl()];
  if (process.env["VERCEL_URL"]) list.push(`https://${process.env["VERCEL_URL"]}`);
  if (process.env["VERCEL_BRANCH_URL"]) list.push(`https://${process.env["VERCEL_BRANCH_URL"]}`);
  for (const extra of (process.env["TRUSTED_ORIGINS"] ?? "").split(","))
    if (extra.trim()) list.push(extra.trim());
  if (process.env["NODE_ENV"] !== "production")
    list.push("http://localhost:5173", "http://localhost:3000");
  return [...new Set(list)];
}

/**
 * BETTER_AUTH_SECRET if set; otherwise derived from the (private) MongoDB URI so a
 * deployment works with just MONGODB_URI. Changing either signs everyone out.
 */
function authSecret(): string {
  const explicit = process.env["BETTER_AUTH_SECRET"]?.trim();
  if (explicit) return explicit;
  const uri = process.env["MONGODB_URI"];
  if (uri) return createHash("sha256").update(`campuscart-auth:${uri}`).digest("base64url");
  return "dev-only-secret-change-me-dev-only-secret";
}

function createAuth() {
  const secret = authSecret();
  // Only demand e-mail verification when we can actually send the e-mail.
  const verify = process.env["REQUIRE_EMAIL_VERIFICATION"] === "true" && isMailConfigured();

  return betterAuth({
    appName: "CampusCart",
    baseURL: siteUrl(),
    basePath: "/api/auth",
    secret,
    trustedOrigins: trustedOrigins(),
    database: mongodbAdapter(getDb(), { client: getClient() }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: verify,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendMail(user.email, renderPasswordResetEmail(url));
      },
    },
    emailVerification: {
      sendOnSignUp: isMailConfigured(),
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendMail(user.email, renderVerifyEmail(url));
      },
    },
    user: {
      additionalFields: {
        phone: { type: "string", required: false, defaultValue: "", input: true },
        department: { type: "string", required: false, defaultValue: "", input: true },
        batch: { type: "string", required: false, defaultValue: "", input: true },
        // Private: never returned in sessions or user responses.
        studentId: {
          type: "string",
          required: false,
          defaultValue: "",
          input: true,
          returned: false,
        },
        // Private profile photo (Cloudinary "authenticated" public_id) — set only via PATCH /api/me.
        avatarId: { type: "string", required: false, input: false, returned: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const clip = (v: unknown, n: number) =>
              String(v ?? "")
                .trim()
                .slice(0, n);
            return {
              data: {
                ...user,
                name: clip(user.name, 80),
                phone: clip((user as Record<string, unknown>)["phone"], 20),
                department: clip((user as Record<string, unknown>)["department"], 60),
                batch: clip((user as Record<string, unknown>)["batch"], 20),
                studentId: clip((user as Record<string, unknown>)["studentId"], 40),
                image: null,
              },
            };
          },
        },
        update: {
          before: async (data) => {
            const rest = { ...(data as Record<string, unknown>) };
            const clip = (k: string, n: number) => {
              if (typeof rest[k] === "string") rest[k] = (rest[k] as string).trim().slice(0, n);
            };
            clip("name", 80);
            clip("phone", 20);
            clip("department", 60);
            clip("batch", 20);
            return { data: rest };
          },
        },
      },
    },
    hooks: {
      // The student ID is identity data, fixed after sign-up; `image` is unused
      // (profile photos are private, set via PATCH /api/me).
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/update-user") return;
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        if ("studentId" in body || "image" in body) {
          throw new APIError("BAD_REQUEST", { message: "This field can't be changed here." });
        }
      }),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // No cookie cache: sign-outs, password resets and bans apply on the next request.
      cookieCache: { enabled: false },
    },
    // Stored in MongoDB so limits hold across serverless instances.
    rateLimit: {
      enabled: process.env["NODE_ENV"] !== "test",
      storage: "database",
      window: 60,
      max: 100,
    },
    advanced: {
      useSecureCookies: process.env["NODE_ENV"] === "production",
      // Keep CSRF/origin protection on in every environment (it is skipped under tests by default).
      disableOriginCheck: false,
      disableCSRFCheck: false,
      // Vercel's edge sets these single-address headers (overwriting client values),
      // so rate limits are per real client instead of one shared bucket.
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-real-ip"] },
    },
    plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] })],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
export function resetAuthForTests() {
  instance = undefined;
}
export type Auth = ReturnType<typeof createAuth>;
