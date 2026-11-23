import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SellerShell } from "@/components/seller/SellerShell";
import { OrderEmailSettings } from "@/components/seller/OrderEmailSettings";
import { ImagePicker } from "@/components/common/ImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, apiPatch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSellerAccount, useUniversities } from "@/lib/seller";
import { departments } from "@/data/departments";

export const Route = createFileRoute("/sell/dashboard/settings")({
  component: SellerSettings,
});

function SellerSettings() {
  const { seller } = useSellerAccount();
  const { profile, refreshProfile } = useAuth();
  const { data: universities = [] } = useUniversities();
  const [showId, setShowId] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");
  // undefined = unchanged, null = remove, string = newly uploaded photo
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // Fill the form once the seller account has loaded (and again after each save).
  useEffect(() => {
    if (!seller) return;
    setFullName(seller.full_name);
    setPhone(seller.phone);
    setDepartment(seller.department);
    setBatch(seller.batch);
  }, [seller]);

  const { data: studentId } = useQuery({
    queryKey: ["seller-student-id", seller?.id],
    enabled: !!seller,
    queryFn: async () => (await api<{ student_id: string | null }>("/seller/identity")).student_id,
  });

  const uni = universities.find((u) => u.slug === seller?.university_slug);
  const masked = studentId
    ? `${studentId.slice(0, 2)}${"•".repeat(Math.max(studentId.length - 2, 3))}`
    : "—";
  // Keep a department that isn't in the list (older accounts) selectable.
  const departmentOptions =
    department && !departments.includes(department) ? [department, ...departments] : departments;
  const initials = (fullName || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 2) return void toast.error("Enter your full name");
    if (phone.trim().length < 6) return void toast.error("Enter a valid phone number");
    if (!batch.trim()) return void toast.error("Enter your batch");
    setBusy(true);
    try {
      await apiPatch("/seller/account", {
        full_name: fullName.trim(),
        phone: phone.trim(),
        department,
        batch: batch.trim(),
        ...(avatar !== undefined ? { avatar_id: avatar } : {}),
      });
      await refreshProfile();
      setAvatar(undefined);
      toast.success("Personal details updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your details");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerShell title="Settings">
      <form onSubmit={onSubmit} className="card-surface space-y-5 p-4 sm:p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Personal details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shown to CampusCart admins when they review your store. Buyers see your store, not these
            details.
          </p>
        </div>

        <ImagePicker
          kind="avatar"
          label="Profile photo"
          previewUrl={avatar === null ? null : (profile?.avatar_path ?? null)}
          fallback={initials}
          onUploaded={setAvatar}
          onRemove={() => setAvatar(null)}
          disabled={busy || !seller}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="se-name">Full name</Label>
            <Input
              id="se-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              autoComplete="name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="se-phone">Phone number</Label>
            <Input
              id="se-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              autoComplete="tel"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="se-batch">Batch</Label>
            <Input
              id="se-batch"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="e.g. 61st"
              maxLength={20}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger aria-label="Department">
                <SelectValue placeholder="Select your department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="se-email">E-mail</Label>
            <Input id="se-email" value={seller?.email ?? ""} disabled readOnly />
          </div>
        </div>

        <Button type="submit" disabled={busy || !seller}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save changes
        </Button>
      </form>

      <div className="card-surface mt-4 divide-y divide-border">
        <Row label="University" value={uni?.name ?? seller?.university_slug ?? "—"} />
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Student ID (private)</span>
          <span className="flex items-center gap-2 font-semibold">
            {showId ? (studentId ?? "—") : masked}
            <button
              type="button"
              onClick={() => setShowId((s) => !s)}
              aria-label={showId ? "Hide Student ID" : "Show Student ID"}
              className="text-muted-foreground"
            >
              {showId ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Your e-mail, university and Student ID can&apos;t be changed here. Your Student ID is never
        shown on your public store, products or reviews. Only you and CampusCart admin can see it.
      </p>
      {seller && <OrderEmailSettings seller={seller} />}
    </SellerShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
