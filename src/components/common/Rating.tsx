import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";

interface RatingProps {
  value: number;
  reviewCount?: number;
  size?: "sm" | "md";
  className?: string;
  showValue?: boolean;
}

export function Rating({ value, reviewCount, size = "sm", className, showValue = true }: RatingProps) {
  const star = size === "sm" ? "size-3.5" : "size-4";
  return (
    <div
      className={cn("flex items-center gap-1.5 text-muted-foreground", className)}
      aria-label={`Rated ${value} out of 5`}
    >
      <span className="flex items-center gap-0.5 text-warning">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            className={cn(star, i < Math.round(value) ? "fill-current" : "opacity-30")}
            aria-hidden="true"
          />
        ))}
      </span>
      {showValue && <span className="text-xs font-semibold text-foreground">{value.toFixed(1)}</span>}
      {reviewCount !== undefined && (
        <span className="text-xs">({formatCount(reviewCount)})</span>
      )}
    </div>
  );
}
