import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiPost } from "@/lib/api";
import { authClient, authErrorMessage } from "@/lib/authClient";

type Methods = { password: boolean; google: boolean; google_available: boolean };

const CONNECT_FLAG = "cc.connectGoogle";

/**
 * Remember that the user tried "Continue with Google" with an e-mail that already has
 * a password account. After they log in with that password, the account page connects
 * Google to the same account (proving both the password and the Google mailbox).
 */
export function rememberGoogleConnect() {
  try {
    sessionStorage.setItem(CONNECT_FLAG, String(Date.now()));
  } catch {
    /* private mode: the user can still use "Connect Google" on the account page */
  }
}

function takeGoogleConnect(): boolean {
  try {
    const at = Number(sessionStorage.getItem(CONNECT_FLAG));
    sessionStorage.removeItem(CONNECT_FLAG);
    return at > 0 && Date.now() - at < 15 * 60_000;
  } catch {
    return false;
  }
}

function linkErrorMessage(code: string | null): string {
  if (code === "email_does_not_match")
    return "That Google account uses a different e-mail. Choose the Google account with your CampusCart e-mail.";
  if (code === "account_already_linked_to_different_user")
    return "That Google account is already connected to another CampusCart account.";
  if (code === "access_denied") return "Connecting Google was cancelled.";
  return "Couldn't connect Google. Please try again.";
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

/** Account page card: how this account signs in — Google, e-mail + password, or both. */
export function SignInMethods() {
  const queryClient = useQueryClient();
  const { data: methods } = useQuery({
    queryKey: ["sign-in-methods"],
    queryFn: () => api<Methods>("/me/sign-in-methods"),
  });
  const [connecting, setConnecting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const autoTried = useRef(false);

  async function connectGoogle() {
    setConnecting(true);
    const { error } = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/account?google=connected",
      errorCallbackURL: "/account?google=failed",
    });
    // On success the browser is already on its way to Google.
    if (error) {
      setConnecting(false);
      toast.error(authErrorMessage(error));
    }
  }

  // Result of a Google connection (Better Auth adds `error` on failure), then tidy the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (!result) return;
    if (result === "connected")
      toast.success("Google is connected. You can log in with Google or your password.");
    else toast.error(linkErrorMessage(params.get("error")));
    window.history.replaceState(null, "", "/account");
  }, []);

  // Finish the connection the user started from "Continue with Google".
  useEffect(() => {
    if (!methods || autoTried.current) return;
    autoTried.current = true;
    if (takeGoogleConnect() && methods.google_available && !methods.google) {
      toast.message("Connecting your Google account…");
      void connectGoogle();
    }
  }, [methods]);

  async function addPassword(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const next = await apiPost<Methods>("/me/password", { new_password: password });
      queryClient.setQueryData(["sign-in-methods"], next);
      setPassword("");
      setAdding(false);
      toast.success("Password added. You can now also log in with your e-mail.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the password.");
    } finally {
      setSaving(false);
    }
  }

  if (!methods) return null;

  return (
    <div className="card-surface p-4">
      <p className="text-xs font-semibold text-muted-foreground">Sign-in methods</p>
      <ul className="mt-3 space-y-2 text-sm">
        {(methods.google_available || methods.google) && (
          <li className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5">
            <span className="flex items-center gap-2.5 font-medium">
              <GoogleMark />
              Google
            </span>
            {methods.google ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-accent">
                <Check className="size-3.5" aria-hidden="true" />
                Connected
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={connectGoogle} disabled={connecting}>
                {connecting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                Connect
              </Button>
            )}
          </li>
        )}
        <li className="rounded-lg px-2.5 py-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 font-medium">
              <KeyRound className="size-4 text-primary" aria-hidden="true" />
              E-mail &amp; password
            </span>
            {methods.password ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-accent">
                <Check className="size-3.5" aria-hidden="true" />
                Set
              </span>
            ) : !adding ? (
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                Add a password
              </Button>
            ) : null}
          </div>
          {!methods.password && adding && (
            <form onSubmit={addPassword} className="mt-3 space-y-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (8+ characters)"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                aria-label="New password"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving || password.length < 8}>
                  {saving && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  Save password
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </li>
      </ul>
    </div>
  );
}
