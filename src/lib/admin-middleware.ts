import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-function middleware: caller must be signed in AND hold the `admin` role.
 *
 * Bootstrap: e-mails listed in the ADMIN_EMAILS secret (comma separated) are
 * granted the admin role on their first visit, so no manual SQL is needed to
 * create the first administrator.
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (isAdmin !== true) {
      const allow = (process.env["ADMIN_EMAILS"] ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const claimed = String(context.claims["email"] ?? "").toLowerCase();
      if (!claimed || !allow.includes(claimed)) throw new Error("Forbidden: admin access only");

      // Confirm against the auth server: the e-mail must be the account's verified address.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const user = authUser?.user;
      if (!user?.email || user.email.toLowerCase() !== claimed || !user.email_confirmed_at) {
        throw new Error("Forbidden: admin access only");
      }
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw error;
    }

    return next({ context: { adminUserId: context.userId } });
  });
