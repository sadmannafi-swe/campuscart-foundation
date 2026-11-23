import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { UploadKind } from "@shared/types";
import { uploadImage } from "@/lib/uploads";
import { cn } from "@/lib/utils";

/**
 * Photo field for profile photos and store logos. Uploads to Cloudinary as soon as a
 * file is picked and hands back the stored value (public_id for private kinds, URL
 * otherwise) through `onUploaded`; the caller saves it with the rest of the form.
 */
export function ImagePicker({
  kind,
  previewUrl,
  fallback,
  shape = "circle",
  onUploaded,
  onRemove,
  disabled,
  label,
}: {
  kind: Extract<UploadKind, "avatar" | "store-logo">;
  /** What is shown now: the saved photo, or null for the fallback. */
  previewUrl: string | null;
  fallback: string;
  shape?: "circle" | "square";
  onUploaded: (value: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const shown = localPreview ?? previewUrl;

  useEffect(() => setBroken(false), [shown]);
  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const local = URL.createObjectURL(file);
    try {
      const value = await uploadImage(file, kind);
      setLocalPreview(local);
      onUploaded(value);
    } catch (err) {
      URL.revokeObjectURL(local);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const radius = shape === "circle" ? "rounded-full" : "rounded-[16px]";

  return (
    <div className="flex items-center gap-4">
      <span
        className={cn(
          "relative grid size-20 shrink-0 place-items-center overflow-hidden bg-bloom-soft font-display text-lg font-semibold text-bloom-ink",
          radius,
        )}
      >
        {shown && !broken ? (
          <img
            src={shown}
            alt=""
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          fallback
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-ink/50 text-ink-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          </span>
        )}
      </span>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={label}
          disabled={disabled || busy}
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => input.current?.click()}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-input bg-surface px-3 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="size-4" aria-hidden="true" />
          {shown ? "Change" : "Upload"} {kind === "avatar" ? "photo" : "logo"}
        </button>
        {shown && onRemove && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              setLocalPreview(null);
              onRemove();
            }}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Remove
          </button>
        )}
        <p className="w-full text-xs text-muted-foreground">JPG or PNG, up to 8 MB</p>
      </div>
    </div>
  );
}
