import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Phone,
  Store,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient, authErrorMessage } from "@/lib/authClient";
import { apiPost } from "@/lib/api";
import { uploadImage } from "@/lib/uploads";
import { departments } from "@/data/departments";
import { useAuth } from "@/lib/auth";
import { storeCategories, useSellerAccount, useUniversities } from "@/lib/seller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sell/register")({
  head: () => ({
    meta: [
      { title: "Create Seller Account — CampusCart" },
      {
        name: "description",
        content:
          "Select your university, create your CampusCart seller account and open your student store.",
      },
      { property: "og:title", content: "Create Seller Account — CampusCart" },
      {
        property: "og:description",
        content: "Select your university and open a store in your CampusCart marketplace.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SellerRegister,
});

/** Must match the API's store schema (server/routes/seller.ts). */
const STORE_DESC_MIN = 10;

type Step = "university" | "account" | "store";

export default function SellerRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { seller, store, refetch } = useSellerAccount();
  const [step, setStep] = useState<Step>("university");
  const [university, setUniversity] = useState<string>("");

  // Resume where the seller left off.
  const activeStep: Step = store ? "store" : seller ? "store" : step;

  if (store) {
    void navigate({ to: "/sell/status", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <Stepper current={activeStep} />

        {activeStep === "university" && (
          <UniversityStep
            value={university}
            onChange={setUniversity}
            onContinue={() => setStep("account")}
          />
        )}

        {activeStep === "account" && !seller && (
          <AccountStep
            universitySlug={university}
            existingUserId={user?.id ?? null}
            onDone={async () => {
              await refetch();
              setStep("store");
            }}
            onBack={() => setStep("university")}
          />
        )}

        {activeStep === "store" && seller && (
          <StoreStep
            sellerId={seller.id}
            userId={seller.user_id}
            universitySlug={seller.university_slug}
            onDone={() => navigate({ to: "/sell/status" })}
          />
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have a seller account?{" "}
          <Link to="/sell/login" className="font-semibold text-primary">
            Seller Login
          </Link>
        </p>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const steps: Array<{ id: Step; label: string }> = [
    { id: "university", label: "University" },
    { id: "account", label: "Account" },
    { id: "store", label: "Store" },
  ];
  const index = steps.findIndex((s) => s.id === current);
  return (
    <ol className="mb-6 flex items-center gap-2">
      {steps.map((s, i) => (
        <li key={s.id} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
              i <= index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {i < index ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span
            className={cn(
              "text-xs font-medium",
              i <= index ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function UniversityStep({
  value,
  onChange,
  onContinue,
}: {
  value: string;
  onChange: (slug: string) => void;
  onContinue: () => void;
}) {
  const { data: universities = [], isLoading } = useUniversities();

  return (
    <div>
      <div className="text-center">
        <h1 className="text-xl font-semibold">Select Your University</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the university where you want to open your store
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading universities…</p>}
        {universities.map((uni) => {
          const selected = value === uni.slug;
          return (
            <button
              key={uni.slug}
              type="button"
              onClick={() => onChange(uni.slug)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 text-left transition-colors",
                selected ? "border-primary bg-primary-soft/40" : "border-border",
              )}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-xs font-semibold text-primary">
                {uni.short_name}
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold">
                {uni.name} ({uni.short_name})
              </span>
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {selected && <Check className="size-3" />}
              </span>
            </button>
          );
        })}
      </div>

      <Button className="mt-6 w-full" disabled={!value} onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}

function AccountStep({
  universitySlug,
  existingUserId,
  onDone,
  onBack,
}: {
  universitySlug: string;
  existingUserId: string | null;
  onDone: () => Promise<void>;
  onBack: () => void;
}) {
  const { user: accountUser } = useAuth();
  // Signed-in users register with their verified account e-mail (locked).
  const accountEmail = existingUserId ? (accountUser?.email ?? "") : null;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!universitySlug) {
      toast.error("Select your university first.");
      onBack();
      return;
    }
    setBusy(true);
    try {
      if (!existingUserId) {
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        const { data, error } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: fullName.trim(),
          phone: phone.trim(),
          studentId: studentId.trim(),
          department,
          batch: batch.trim(),
          callbackURL: "/sell/register",
        });
        if (error) throw new Error(authErrorMessage(error));
        if (!data?.token) {
          toast.success(
            "Account created. Confirm your e-mail, then log in as a seller to continue.",
          );
          setBusy(false);
          return;
        }
      }

      let avatarUrl: string | null = null;
      if (photo) {
        try {
          avatarUrl = await uploadImage(photo, "avatar");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Profile photo upload failed.");
        }
      }

      let idImage: string | null = null;
      if (idPhoto) {
        try {
          idImage = await uploadImage(idPhoto, "student-id");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Student ID photo upload failed.");
        }
      }

      await apiPost("/seller/account", {
        university_slug: universitySlug,
        full_name: fullName.trim(),
        phone: phone.trim(),
        department,
        batch: batch.trim(),
        student_id: studentId.trim(),
        avatar_id: avatarUrl,
        student_id_image: idImage,
      });

      toast.success("Seller account created. Now set up your store.");
      await onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create seller account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-xl font-semibold">Create Seller Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Fill in your personal information</p>
      </div>

      <form onSubmit={onSubmit} className="card-surface mt-5 space-y-4 p-4">
        <Field id="s-name" label="Full Name" icon={User}>
          <Input
            id="s-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            maxLength={80}
            required
          />
        </Field>

        <Field id="s-email" label="Email" icon={Mail}>
          <Input
            id="s-email"
            type="email"
            value={accountEmail ?? email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            readOnly={accountEmail !== null}
            aria-readonly={accountEmail !== null}
            className={cn(
              accountEmail !== null && "cursor-not-allowed bg-muted text-muted-foreground",
            )}
            required
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {accountEmail !== null
              ? "Your account e-mail can't be changed here. "
              : "This becomes your login e-mail. "}
            To get order e-mails at another address, use Settings → New order e-mails after setup.
          </p>
        </Field>

        <Field id="s-phone" label="Phone Number" icon={Phone}>
          <Input
            id="s-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            maxLength={20}
            required
          />
        </Field>

        <Field id="s-student" label="Student ID" icon={Building2}>
          <Input
            id="s-student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter your student ID"
            maxLength={40}
            required
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Private — visible only to you and CampusCart admin.
          </p>
        </Field>

        <div className="space-y-1.5">
          <Label htmlFor="s-idphoto">Student ID Photo (optional)</Label>
          <Input
            id="s-idphoto"
            type="file"
            accept="image/*"
            onChange={(e) => setIdPhoto(e.target.files?.[0] ?? null)}
          />
          <p className="text-[11px] text-muted-foreground">
            Helps CampusCart admin verify you faster. Only the admin can see it.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={department} onValueChange={setDepartment} required>
            <SelectTrigger>
              <SelectValue placeholder="Select your department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="s-batch">Batch</Label>
          <Input
            id="s-batch"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="e.g. 61st"
            maxLength={20}
            autoComplete="off"
            required
          />
        </div>

        {!existingUserId && (
          <div className="space-y-1.5">
            <Label htmlFor="s-password">Password</Label>
            <div className="relative">
              <Input
                id="s-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="s-photo">Profile Photo (Optional)</Label>
          <label
            htmlFor="s-photo"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
          >
            <Upload className="size-4" aria-hidden="true" />
            {photo ? photo.name : "Upload Photo"}
          </label>
          <input
            id="s-photo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button
            type="submit"
            className="flex-[2]"
            disabled={busy || !department || !batch.trim()}
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create Account
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        {label}
      </Label>
      {children}
    </div>
  );
}

function StoreStep({
  sellerId,
  userId,
  universitySlug,
  onDone,
}: {
  sellerId: string;
  userId: string;
  universitySlug: string;
  onDone: () => void;
}) {
  const [logo, setLogo] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  // Keep the uploaded logo so a retry after a validation error doesn't upload it again.
  const [uploadedLogo, setUploadedLogo] = useState<{ file: File; url: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Check the form before uploading anything (the API enforces the same rules).
    if (name.trim().length < 2)
      return void toast.error("Store name must be at least 2 characters.");
    if (description.trim().length < STORE_DESC_MIN)
      return void toast.error(`Store description must be at least ${STORE_DESC_MIN} characters.`);
    if (!category) return void toast.error("Select a store category.");
    if (contact.trim().length < 6) return void toast.error("Enter a valid contact number.");
    setBusy(true);
    try {
      let logoUrl: string | null = null;
      if (logo) {
        if (uploadedLogo?.file === logo) {
          logoUrl = uploadedLogo.url;
        } else {
          try {
            logoUrl = await uploadImage(logo, "store-logo");
            setUploadedLogo({ file: logo, url: logoUrl });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Logo upload failed.");
          }
        }
      }
      await apiPost("/seller/store", {
        name: name.trim(),
        description: description.trim(),
        category,
        contact_number: contact.trim(),
        logo_url: logoUrl,
      });
      toast.success("Store submitted for review.");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your store.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-xl font-semibold">Store Information</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tell us about your store</p>
      </div>

      <form onSubmit={onSubmit} className="card-surface mt-5 space-y-4 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="store-logo">Store Logo</Label>
          <label
            htmlFor="store-logo"
            className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/30 text-sm font-medium text-primary"
          >
            <Store className="size-6" aria-hidden="true" />
            {logo ? logo.name : "Upload Store Logo"}
          </label>
          <input
            id="store-logo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="store-name">Store Name</Label>
          <Input
            id="store-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your store name"
            maxLength={60}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="store-desc">Store Description</Label>
          <Textarea
            id="store-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            placeholder="What do you sell? e.g. Home-cooked lunch boxes delivered on campus"
            rows={4}
            required
            aria-describedby="store-desc-hint"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span
              id="store-desc-hint"
              className={
                description.length > 0 && description.trim().length < STORE_DESC_MIN
                  ? "text-destructive"
                  : undefined
              }
            >
              At least {STORE_DESC_MIN} characters
            </span>
            <span>{description.length}/200</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Store Category</Label>
          <Select value={category} onValueChange={setCategory} required>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {storeCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="store-contact">Contact Number</Label>
          <Input
            id="store-contact"
            type="tel"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Enter contact number"
            maxLength={20}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy || !category}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          Submit Store
        </Button>
      </form>
    </div>
  );
}
