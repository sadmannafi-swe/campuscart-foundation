import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, Flag, ImageOff, Loader2, MessageCircle, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReason,
  type ReportTarget,
} from "@shared/types";
import { BackButton } from "@/components/common/BackButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { openContextChat, reportContent } from "@/lib/modules";
import { uploadImage } from "@/lib/uploads";
import { cn } from "@/lib/utils";

/** Each module has one accent colour; everything else follows the CampusCart system. */
export type ModuleAccent = "preowned" | "blood" | "basha";

export const accent: Record<
  ModuleAccent,
  { text: string; bg: string; soft: string; border: string; button: string }
> = {
  preowned: {
    text: "text-preowned",
    bg: "bg-preowned",
    soft: "bg-preowned-soft",
    border: "border-preowned/40",
    button: "bg-preowned text-white hover:bg-preowned/90",
  },
  blood: {
    text: "text-blood",
    bg: "bg-blood",
    soft: "bg-blood-soft",
    border: "border-blood/40",
    button: "bg-blood text-white hover:bg-blood/90",
  },
  basha: {
    text: "text-basha",
    bg: "bg-basha",
    soft: "bg-basha-soft",
    border: "border-basha/40",
    button: "bg-basha text-white hover:bg-basha/90",
  },
};

/** Page header for a module page: back link, icon tile, title, actions. */
export function ModuleHeader({
  tone,
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  back = true,
}: {
  tone: ModuleAccent;
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: boolean;
}) {
  return (
    <div className="mb-6">
      {back && <BackButton className="mb-3" />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-[14px] animate-rise",
              accent[tone].soft,
              accent[tone].text,
            )}
          >
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            {eyebrow && <p className={cn("text-xs font-medium", accent[tone].text)}>{eyebrow}</p>}
            <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              {title}
            </h1>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatusPill({ status, tone }: { status: string; tone?: "good" | "muted" | "bad" }) {
  const t =
    tone ??
    (["available", "active"].includes(status)
      ? "good"
      : ["sold", "rented", "fulfilled"].includes(status)
        ? "muted"
        : "bad");
  const label: Record<string, string> = {
    available: "Available",
    active: "Active",
    sold: "Sold",
    rented: "Rented",
    unavailable: "Unavailable",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
    hidden: "Hidden by admin",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        t === "good" && "bg-accent-soft text-accent",
        t === "muted" && "bg-muted text-muted-foreground",
        t === "bad" && "bg-destructive/10 text-destructive",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          t === "good" ? "bg-accent" : t === "muted" ? "bg-muted-foreground" : "bg-destructive",
        )}
      />
      {label[status] ?? status}
    </span>
  );
}

/** Multiple photo upload to Cloudinary (own folder), with thumbnails and remove. */
export function ImagesField({
  kind,
  value,
  onChange,
  max,
  label = "Photos",
  disabled,
}: {
  kind: "preowned" | "basha";
  value: string[];
  onChange: (urls: string[]) => void;
  max: number;
  label?: string;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const room = max - value.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) toast.error(`You can add up to ${max} photos.`);
    setBusy(picked.length);
    const uploaded: string[] = [];
    for (const file of picked) {
      try {
        uploaded.push(await uploadImage(file, kind));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}{" "}
        <span className="font-normal text-muted-foreground">
          ({value.length}/{max}, first photo is the cover)
        </span>
      </Label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {value.map((url, i) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-[12px] border border-border bg-muted"
          >
            <img src={url} alt="" className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[10px] text-ink-foreground">
                Cover
              </span>
            )}
            <button
              type="button"
              aria-label="Remove photo"
              disabled={disabled}
              onClick={() => onChange(value.filter((v) => v !== url))}
              className="absolute right-1.5 top-1.5 grid size-7 cursor-pointer place-items-center rounded-full bg-surface/90 text-foreground shadow-sm transition-colors hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {Array.from({ length: busy }, (_, i) => (
          <div
            key={`b${i}`}
            className="grid aspect-square place-items-center rounded-[12px] border border-dashed border-border bg-muted"
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ))}
        {value.length + busy < max && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            className="grid aspect-square cursor-pointer place-items-center rounded-[12px] border border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <span className="flex flex-col items-center gap-1 text-xs">
              <Camera className="size-5" aria-hidden="true" />
              Add photo
            </span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        aria-label={label}
        onChange={(e) => void add(e.target.files)}
      />
      <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 8 MB each</p>
    </div>
  );
}

/** Photo gallery for detail pages: big image plus thumbnails. */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const current = images[i];
  return (
    <div>
      <div className="relative aspect-4/3 overflow-hidden rounded-[20px] border border-border bg-muted">
        {current ? (
          <img
            key={current}
            src={current}
            alt={alt}
            className="size-full object-cover animate-rise"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden="true" />
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-2 grid grid-cols-5 gap-2">
          {images.map((src, k) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Show photo ${k + 1}`}
              className={cn(
                "aspect-square cursor-pointer overflow-hidden rounded-[10px] border-2 transition-[border-color,opacity]",
                k === i ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Starts (or reopens) a conversation about this item in CampusCart Messages. */
export function ContactButton({
  kind,
  id,
  label,
  tone,
  disabled,
  className,
}: {
  kind: ReportTarget;
  id: string;
  label: string;
  tone: ModuleAccent;
  disabled?: boolean;
  className?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="lg"
      disabled={disabled || busy}
      className={cn(accent[tone].button, className)}
      onClick={async () => {
        if (!user) {
          toast.message("Log in to send a message");
          void navigate({ to: "/auth", search: { mode: "login" } });
          return;
        }
        setBusy(true);
        try {
          const conversationId = await openContextChat(kind, id);
          void navigate({ to: "/chat/$conversationId", params: { conversationId } });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not open the chat");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <MessageCircle />}
      {label}
    </Button>
  );
}

/** "Report" link with a reason picker; reports go to the CampusCart admins. */
export function ReportButton({ kind, id }: { kind: ReportTarget; id: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("misleading");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!user) {
            void navigate({ to: "/auth", search: { mode: "login" } });
            return;
          }
          setOpen(true);
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
      >
        <Flag className="size-3.5" aria-hidden="true" />
        Report
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report this post</DialogTitle>
            <DialogDescription>
              CampusCart admins review every report. The person who posted it won&apos;t see who
              reported it.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="sr-only">Reason</legend>
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2 text-sm transition-colors",
                  reason === r
                    ? "border-foreground/30 bg-muted"
                    : "border-border hover:bg-muted/60",
                )}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-[var(--color-ink)]"
                />
                {REPORT_REASON_LABELS[r]}
              </label>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea
              id="report-details"
              rows={3}
              maxLength={1000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await reportContent(kind, id, reason, details.trim());
                  toast.success("Thanks. Our team will review it.");
                  setOpen(false);
                  setDetails("");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not send the report");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy && <Loader2 className="animate-spin" />}
              Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Shown in place of create/manage pages for visitors who aren't logged in. */
export function LoginPrompt({ text }: { text: string }) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      <Button asChild>
        <Link to="/auth" search={{ mode: "login" }}>
          Log in / Create account
        </Link>
      </Button>
    </div>
  );
}

/** Small labelled value for detail pages. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[12px] border border-border bg-background px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.max(1, Math.round(d / 60))} min ago`;
  if (d < 86400) return `${Math.round(d / 3600)} h ago`;
  return `${Math.round(d / 86400)} d ago`;
};
