import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** <img> that swaps to a text badge when the file is missing, so layouts never show a broken icon. */
export function BrandImage({
  fallback,
  className,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { fallback: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cn(
          "inline-grid place-items-center rounded-xl bg-primary-soft px-1 font-extrabold text-primary",
          className,
          fallback.length === 4 && "text-[11px]",
        )}
      >
        {fallback}
      </span>
    );
  }
  return <img {...props} alt={alt} className={className} onError={() => setFailed(true)} />;
}
