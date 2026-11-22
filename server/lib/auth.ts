import { betterAuth } from "better-auth";
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

function createAuth() {
  const secret = process.env["BETTER_AUTH_SECRET"];
  if (!secret && process.env["NODE_ENV"] === "production") {
    throw new Error("BETTER_AUTH_SECRET is not set");
  }
  // Only demand e-mail verification when we can actually send the e-mail.
  const verify = process.env["REQUIRE_EMAIL_VERIFICATION"] === "true" && isMailConfigured();

  return betterAuth({
    appName: "CampusCart",
    baseURL: siteUrl(),
    basePath: "/api/auth",
    secret: secret ?? "dev-only-secret-change-me-dev-only-secret",
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
              },
            };
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
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
