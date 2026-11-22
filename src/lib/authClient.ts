import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

/** Better Auth client — talks to /api/auth on the same origin. */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    inferAdditionalFields({
      user: {
        phone: { type: "string", required: false },
        department: { type: "string", required: false },
        batch: { type: "string", required: false },
        studentId: { type: "string", required: false },
        role: { type: "string", required: false, input: false },
      },
    }),
  ],
});

/** Better Auth returns { error: { message } } instead of throwing. */
export function authErrorMessage(
  error: { message?: string | undefined; status?: number | undefined } | null | undefined,
): string {
  if (!error) return "Something went wrong. Please try again.";
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  return error.message || "Something went wrong. Please try again.";
}
