import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small, consistent back navigation for internal buyer pages.
 * Uses router history so users return to where they actually came from.
 */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    router.navigate({ to: "/" });
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary",
        className,
      )}
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Back
    </button>
  );
}
