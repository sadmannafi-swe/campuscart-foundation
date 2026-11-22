import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { getDb } from "./db";

/**
 * Account-based brute-force protection, complementing Better Auth's per-IP limits.
 * Students on campus Wi-Fi share one public IP, so per-IP limits must be generous;
 * this guard protects each account individually instead.
 */
export const LOGIN_GUARD = {
  maxFailures: 8, // failed passwords per account …
  failureWindowMs: 15 * 60_000, // … within 15 minutes
  lockMs: 15 * 60_000, // locks sign-in for that account for 15 minutes
  maxResetEmails: 5, // password-reset e-mails per address …
  resetWindowMs: 60 * 60_000, // … per hour
};

interface AttemptDoc {
  _id: string; // lower-cased e-mail
  failures: number;
  first_failure_at: Date | null;
  locked_until: Date | null;
  resets: number;
  first_reset_at: Date | null;
}

const attempts = () => getDb().collection<AttemptDoc>("auth_attempts");
const emailOf = (body: unknown) =>
  body && typeof body === "object" && typeof (body as { email?: unknown }).email === "string"
    ? (body as { email: string }).email.trim().toLowerCase()
    : "";

const minutesLeft = (until: Date) =>
  Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));

export const loginGuardBefore = createAuthMiddleware(async (ctx) => {
  const email = emailOf(ctx.body);
  if (!email) return;
  const now = Date.now();
  if (ctx.path === "/sign-in/email") {
    const doc = await attempts().findOne({ _id: email });
    if (doc?.locked_until && doc.locked_until.getTime() > now) {
      throw new APIError("TOO_MANY_REQUESTS", {
        message: `Too many failed sign-in attempts for this account. Try again in ${minutesLeft(doc.locked_until)} minute(s).`,
      });
    }
  }
  if (ctx.path === "/request-password-reset") {
    const doc = await attempts().findOne({ _id: email });
    const fresh =
      !doc?.first_reset_at || now - doc.first_reset_at.getTime() > LOGIN_GUARD.resetWindowMs;
    if (!fresh && (doc?.resets ?? 0) >= LOGIN_GUARD.maxResetEmails) {
      throw new APIError("TOO_MANY_REQUESTS", {
        message: "Too many reset requests. Please try again later.",
      });
    }
    await attempts().updateOne(
      { _id: email },
      fresh
        ? {
            $set: { resets: 1, first_reset_at: new Date(now) },
            $setOnInsert: { failures: 0, first_failure_at: null, locked_until: null },
          }
        : { $inc: { resets: 1 } },
      { upsert: true },
    );
  }
});

export const loginGuardAfter = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/sign-in/email") return;
  const email = emailOf(ctx.body);
  if (!email) return;
  const returned = ctx.context.returned;
  if (isAPIError(returned)) {
    if (returned.statusCode !== 401) return; // only count wrong credentials
    const now = Date.now();
    const doc = await attempts().findOne({ _id: email });
    const fresh =
      !doc?.first_failure_at || now - doc.first_failure_at.getTime() > LOGIN_GUARD.failureWindowMs;
    const failures = fresh ? 1 : (doc?.failures ?? 0) + 1;
    await attempts().updateOne(
      { _id: email },
      {
        $set: {
          failures,
          first_failure_at: fresh ? new Date(now) : (doc?.first_failure_at ?? new Date(now)),
          locked_until:
            failures >= LOGIN_GUARD.maxFailures ? new Date(now + LOGIN_GUARD.lockMs) : null,
        },
        $setOnInsert: { resets: 0, first_reset_at: null },
      },
      { upsert: true },
    );
  } else if (returned) {
    // Successful sign-in clears the failure counter.
    await attempts().updateOne(
      { _id: email },
      { $set: { failures: 0, first_failure_at: null, locked_until: null } },
    );
  }
});
