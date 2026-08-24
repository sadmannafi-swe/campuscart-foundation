import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Heart, Loader2, LogOut, Package, ShieldCheck, ShoppingCart, User } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — DIU CampusCart" },
      { name: "description", content: "Manage your CampusCart student profile." },
      { property: "og:title", content: "Account — DIU CampusCart" },
      { property: "og:description", content: "Manage your CampusCart student profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

const quickLinks = [
  { label: "Orders", to: "/orders" as const, icon: Package },
  { label: "Wishlist", to: "/wishlist" as const, icon: Heart },
  { label: "Cart", to: "/cart" as const, icon: ShoppingCart },
];

function AccountPage() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [showStudentId, setShowStudentId] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("student_identity")
      .select("student_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setStudentId((data?.student_id as string | undefined) ?? null));
  }, [user]);

  useEffect(() => {
    if (!profile?.avatar_path) {
      setAvatarUrl(null);
      return;
    }
    void supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_path, 3600)
      .then(({ data }) => setAvatarUrl(data?.signedUrl ?? null));
  }, [profile?.avatar_path]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="container-page space-y-4 py-10">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
      </SiteLayout>
    );
  }

  if (!user) {
    return (
      <SiteLayout>
        <div className="container-page py-10">
          <BackButton className="mb-3" />
          <h1 className="text-2xl font-extrabold sm:text-3xl">Profile</h1>
          <div className="mt-6">
            <EmptyState
              icon={<User className="size-6" aria-hidden="true" />}
              title="Sign in to your CampusCart account"
              description="Log in to track orders, save wishlist items and keep your cart across devices."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to="/auth" search={{ mode: "login" }}>
                      Log in
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Create account
                    </Link>
                  </Button>
                </div>
              }
            />
          </div>
        </div>
      </SiteLayout>
    );
  }

  const initials = (profile?.full_name || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <BackButton className="mb-3" />
        <h1 className="text-2xl font-extrabold sm:text-3xl">Profile</h1>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="card-surface p-4 sm:p-6 lg:col-span-2">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.full_name || "Profile picture"}
                  className="size-16 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-16 place-items-center rounded-full bg-primary-soft text-lg font-bold text-primary">
                  {initials}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{profile?.full_name || "CampusCart student"}</p>
                <p className="truncate text-sm text-muted-foreground">{profile?.email || user.email}</p>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Phone number" value={profile?.phone || "—"} />
              <Field label="Department" value={profile?.department || "—"} />
              <Field label="Batch" value={profile?.batch || "—"} />
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Student ID (private)
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-medium">
                  <span>{showStudentId ? (studentId ?? "—") : "•••••••••"}</span>
                  {studentId && (
                    <button
                      type="button"
                      onClick={() => setShowStudentId((s) => !s)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {showStudentId ? "Hide" : "Show"}
                    </button>
                  )}
                </dd>
              </div>
            </dl>

            <p className="mt-5 flex items-start gap-2 rounded-lg bg-primary-soft/60 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              Your Student ID is visible only to you and campus admins. It is never shown on
              listings, reviews or your public profile.
            </p>
          </div>

          <div className="space-y-3">
            <div className="card-surface p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Shortcuts
              </p>
              <div className="mt-3 space-y-1">
                {quickLinks.map(({ label, to, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await signOut();
                toast.success("Signed out");
                void navigate({ to: "/", replace: true });
              }}
            >
              <LogOut className="mr-2 size-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

// Keeps the loading spinner import referenced for future async states.
export const _spinner = Loader2;
