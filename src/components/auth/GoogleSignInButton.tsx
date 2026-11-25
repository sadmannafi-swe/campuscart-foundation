import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { authClient, authErrorMessage } from "@/lib/authClient";
import { cn } from "@/lib/utils";

/** Whether the server has Google sign-in configured. */
export function useGoogleSignIn() {
  const { data } = useQuery({
    queryKey: ["auth-providers"],
    queryFn: () => api<{ google: boolean }>("/auth-providers"),
    staleTime: 5 * 60_000,
  });
  return data?.google ?? false;
}

/** Messages for the `error` code Better Auth adds to the page it returns to. */
export function googleErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  if (code === "account_not_linked")
    return "This e-mail already has a CampusCart account. Log in with your password once to connect Google to it — after that, “Continue with Google” works too.";
  if (code === "access_denied") return "Google sign-in was cancelled.";
  return "Google sign-in didn't work. Please try again or use your e-mail and password.";
}

/**
 * "Continue with Google". Renders nothing until the server reports Google is set up,
 * so the button never leads to a broken flow.
 */
export function GoogleSignInButton({
  callbackURL,
  errorCallbackURL,
  label = "Continue with Google",
  className,
}: {
  /** Where to land after signing in, e.g. "/account". */
  callbackURL: string;
  /** Where to land if Google sign-in fails; an `error` query param is added. */
  errorCallbackURL: string;
  label?: string;
  className?: string;
}) {
  const enabled = useGoogleSignIn();
  const [busy, setBusy] = useState(false);
  if (!enabled) return null;

  async function onClick() {
    setBusy(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL,
    });
    // On success the browser is already on its way to Google.
    if (error) {
      setBusy(false);
      toast.error(authErrorMessage(error));
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border border-input bg-surface text-sm font-medium transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
            />
          </svg>
        )}
        {label}
      </button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use your e-mail
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
