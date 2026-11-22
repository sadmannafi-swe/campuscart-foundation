import { Package } from "lucide-react";
import { thumbUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

export function ItemThumb({ path, alt, className }: { path?: string | null | undefined; alt: string; className?: string }) {
  const url = thumbUrl(path, 200);
  return (
    <span
      className={cn(
        "grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary-soft to-accent-soft",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={alt} className="size-full object-cover" loading="lazy" />
      ) : (
        <Package className="size-6 text-primary/60" aria-hidden="true" />
      )}
    </span>
  );
}
