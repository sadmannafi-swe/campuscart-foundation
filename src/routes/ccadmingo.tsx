import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy console address — the admin console now lives at /admin behind admin login. */
export const Route = createFileRoute("/ccadmingo")({
  beforeLoad: () => {
    throw redirect({ to: "/admin", replace: true });
  },
});
