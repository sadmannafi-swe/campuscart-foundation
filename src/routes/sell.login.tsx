import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sell/login")({
  head: () => ({
    meta: [
      { title: "Seller Login — CampusCart" },
      { name: "description", content: "Login to your CampusCart seller account and manage your university store." },
      { property: "og:title", content: "Seller Login — CampusCart" },
      { property: "og:description", content: "Login to your CampusCart seller account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SellerLogin,
});

export default function SellerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    void navigate({ to: "/sell/status" });
  }

  async function onForgot() {
    if (!email.trim()) {
      toast.error("Enter your email first, then tap 'Forgot Password'.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email.");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-20 place-items-center rounded-3xl bg-primary-soft text-primary">
            <Store className="size-10" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-extrabold">Welcome Back!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Login to your seller account</p>
        </div>

        <div className="card-surface mt-6 p-4 sm:p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="seller-email">Email</Label>
              <Input
                id="seller-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seller-password">Password</Label>
              <div className="relative">
                <Input
                  id="seller-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={onForgot}
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Login
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/sell/register" className="font-semibold text-primary">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
