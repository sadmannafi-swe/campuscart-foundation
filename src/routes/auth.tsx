import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type AuthMode = "login" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: AuthMode } => ({
    mode: search["mode"] === "signup" ? "signup" : search["mode"] === "login" ? "login" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log in or sign up — DIU CampusCart" },
      {
        name: "description",
        content: "Access your DIU CampusCart student account to shop, save and track orders.",
      },
      { property: "og:title", content: "Log in or sign up — DIU CampusCart" },
      {
        property: "og:description",
        content: "Access your DIU CampusCart student account to shop, save and track orders.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<AuthMode>(mode ?? "login");

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/account", replace: true });
  }, [loading, user, navigate]);

  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <BackButton className="mb-3" />
        <div className="mx-auto w-full max-w-md">
          <div className="mb-5 text-center">
            <h1 className="text-2xl font-extrabold sm:text-3xl">Your CampusCart account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              One student account for buying today — and selling second-hand later.
            </p>
          </div>

          <div className="card-surface p-4 sm:p-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as AuthMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-5">
                <LoginForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-5">
                <SignupForm />
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Your Student ID stays private. It is never shown on your public profile, listings or
            reviews — only campus admins can access it.
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder = "••••••••",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        minLength={8}
        className="pl-9 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    void navigate({ to: "/account" });
  }

  async function onForgotPassword() {
    if (!email.trim()) {
      toast.error("Enter your email first, then tap 'Forgot password'.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">DIU email</Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@diu.edu.bd"
            autoComplete="email"
            required
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <PasswordInput
          id="login-password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
        Log in
      </Button>
    </form>
  );
}

function SignupForm() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          student_id: studentId.trim(),
          department: department.trim(),
          batch: batch.trim(),
        },
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    const userId = data.user?.id;
    if (avatar && userId && data.session) {
      const ext = avatar.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatar, { upsert: true });
      if (!uploadError) {
        await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
      }
    }

    setBusy(false);

    if (!data.session) {
      toast.success("Account created. Check your email to confirm, then log in.");
      return;
    }
    toast.success("Welcome to CampusCart!");
    void navigate({ to: "/account" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="su-name">Full name *</Label>
        <Input
          id="su-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nafi Rahman"
          autoComplete="name"
          maxLength={80}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="su-email">DIU email *</Label>
          <Input
            id="su-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@diu.edu.bd"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="su-phone">Phone number *</Label>
          <Input
            id="su-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            autoComplete="tel"
            maxLength={20}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-student-id">Student ID *</Label>
        <Input
          id="su-student-id"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="221-15-1234"
          maxLength={40}
          required
        />
        <p className="text-xs text-muted-foreground">
          Private — kept for campus verification only, never shown to other students.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="su-dept">Department (optional)</Label>
          <Input
            id="su-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="CSE"
            maxLength={60}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="su-batch">Batch (optional)</Label>
          <Input
            id="su-batch"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="61st"
            maxLength={20}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-avatar">Profile picture (optional)</Label>
        <label
          htmlFor="su-avatar"
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <Upload className="size-4" aria-hidden="true" />
          <span className="truncate">{avatar ? avatar.name : "Upload a photo"}</span>
        </label>
        <input
          id="su-avatar"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-password">Password *</Label>
        <PasswordInput
          id="su-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
        Create account
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Already registered?{" "}
        <Link to="/auth" search={{ mode: "login" }} className="font-medium text-primary hover:underline">
          Log in instead
        </Link>
      </p>
    </form>
  );
}
