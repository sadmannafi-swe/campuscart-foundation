import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Heart,
  Loader2,
  LogOut,
  MessageCircle,
  Package,
  Pencil,
  ShieldCheck,
  ShoppingCart,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePicker } from "@/components/common/ImagePicker";
import { apiPatch } from "@/lib/api";
import { useAuth, type BuyerProfile } from "@/lib/auth";
import { useUnreadChatCounts } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { useImageFallback } from "@/lib/useImageFallback";

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
  { label: "Notifications", to: "/notifications" as const, icon: Bell },
  { label: "Wishlist", to: "/wishlist" as const, icon: Heart },
  { label: "Cart", to: "/cart" as const, icon: ShoppingCart },
];

function AccountPage() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const studentId = profile?.student_id ?? null;
  const [showStudentId, setShowStudentId] = useState(false);
  const [editing, setEditing] = useState(false);
  const avatarUrl = profile?.avatar_path ?? null;
  const avatarImg = useImageFallback(avatarUrl);
  const { data: unreadCounts } = useUnreadChatCounts(user?.id);
  const unreadTotal = unreadCounts ? Object.values(unreadCounts).reduce((sum, n) => sum + n, 0) : 0;

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
          <h1 className="text-2xl font-semibold sm:text-3xl">Profile</h1>
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
        <h1 className="text-2xl font-semibold sm:text-3xl">Profile</h1>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {editing && profile ? (
            <EditProfile profile={profile} initials={initials} onDone={() => setEditing(false)} />
          ) : (
            <div className="card-surface p-4 sm:p-6 lg:col-span-2">
              <div className="flex items-center gap-4">
                {avatarImg.showImage && avatarUrl ? (
                  <img
                    onError={avatarImg.onError}
                    src={avatarUrl}
                    alt={profile?.full_name || "Profile picture"}
                    className="size-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid size-16 place-items-center rounded-full bg-primary-soft text-lg font-semibold text-primary">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">
                    {profile?.full_name || "CampusCart student"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {profile?.email || user.email}
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Phone number" value={profile?.phone || "—"} />
                <Field label="Department" value={profile?.department || "—"} />
                <Field label="Batch" value={profile?.batch || "—"} />
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
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
              <Button variant="outline" className="mt-5" onClick={() => setEditing(true)}>
                <Pencil className="size-4" aria-hidden="true" />
                Edit profile
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <Button asChild className="w-full justify-between">
              <Link to="/chat">
                <span className="flex items-center gap-2">
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Messages
                </span>
                {unreadTotal > 0 && (
                  <span
                    className={cn(
                      "grid min-w-5 place-items-center rounded-full px-1.5 text-xs font-semibold",
                      "bg-background/25 text-primary-foreground",
                    )}
                  >
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </span>
                )}
              </Link>
            </Button>
            <div className="card-surface p-4">
              <p className="text-xs font-semibold text-muted-foreground">Shortcuts</p>
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
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

/** Edits name, phone, department, batch and photo. The Student ID and e-mail stay fixed. */
function EditProfile({
  profile,
  initials,
  onDone,
}: {
  profile: BuyerProfile;
  initials: string;
  onDone: () => void;
}) {
  const { refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone);
  const [department, setDepartment] = useState(profile.department ?? "");
  const [batch, setBatch] = useState(profile.batch ?? "");
  // undefined = unchanged, null = remove, string = newly uploaded photo
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      toast.error("Enter your full name");
      return;
    }
    setBusy(true);
    try {
      await apiPatch("/me", {
        full_name: fullName.trim(),
        phone: phone.trim(),
        department: department.trim(),
        batch: batch.trim(),
        ...(avatar !== undefined ? { avatar_id: avatar } : {}),
      });
      await refreshProfile();
      toast.success("Profile updated");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-surface space-y-5 p-4 sm:p-6 lg:col-span-2">
      <h2 className="font-display text-lg font-semibold">Edit profile</h2>
      <ImagePicker
        kind="avatar"
        label="Profile photo"
        previewUrl={avatar === null ? null : profile.avatar_path}
        fallback={initials}
        onUploaded={setAvatar}
        onRemove={() => setAvatar(null)}
        disabled={busy}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pf-name">Full name</Label>
          <Input
            id="pf-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={80}
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-phone">Phone number</Label>
          <Input
            id="pf-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-dept">Department</Label>
          <Input
            id="pf-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="CSE"
            maxLength={60}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-batch">Batch</Label>
          <Input
            id="pf-batch"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="e.g. 61st"
            maxLength={20}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-email">E-mail</Label>
          <Input id="pf-email" value={profile.email} disabled readOnly />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Your e-mail and Student ID can&apos;t be changed here. Contact campus support if they are
        wrong.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
