import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, authErrorMessage } from "@/lib/authClient";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — DIU CampusCart" },
      { name: "description", content: "Set a new password for your CampusCart student account." },
      { property: "og:title", content: "Reset password — DIU CampusCart" },
      {
        property: "og:description",
        content: "Set a new password for your CampusCart student account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setBusy(false);
      toast.error(
        "This reset link is invalid or has expired. Request a new one from the login page.",
      );
      return;
    }
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    toast.success("Password updated. Log in with your new password.");
    void navigate({ to: "/auth", search: { mode: "login" } });
  }

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <BackButton className="mb-3" />
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <form onSubmit={onSubmit} className="card-surface mt-5 space-y-4 p-4 sm:p-6">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
}
