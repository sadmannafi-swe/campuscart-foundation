import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { flyToCart } from "@/lib/motion";
import { cn } from "@/lib/utils";

type State = "idle" | "adding" | "added";

/**
 * Add to Cart with feedback on the button itself: a squeeze on press, a short
 * spinner, then "✓ Added to Cart" (the check draws in) while the product photo
 * flies to the header cart — then it settles back. `onAdd` runs immediately; the
 * animation is only feedback. A live region announces the result.
 */
export function AddToCartButton({
  onAdd,
  image,
  className,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  onAdd: () => void;
  image?: string | null | undefined;
}) {
  const [state, setState] = useState<State>("idle");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <Button
      {...props}
      disabled={disabled}
      data-state={state}
      aria-busy={state === "adding"}
      className={cn("atc-button relative overflow-hidden", className)}
      onClick={(e) => {
        if (state !== "idle") return;
        onAdd();
        flyToCart(e.currentTarget, image);
        setState("adding");
        timers.current.forEach(clearTimeout);
        timers.current = [
          window.setTimeout(() => setState("added"), 420),
          window.setTimeout(() => setState("idle"), 2000),
        ];
      }}
    >
      <span key={state} className="atc-label inline-flex items-center gap-2">
        {state === "adding" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Adding…
          </>
        ) : state === "added" ? (
          <>
            <svg
              viewBox="0 0 24 24"
              className="atc-check size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12.5l4.2 4.2L19 7" pathLength={1} />
            </svg>
            Added to Cart
          </>
        ) : (
          "Add to Cart"
        )}
      </span>
      <span className="sr-only" aria-live="polite">
        {state === "added" ? "Added to cart" : ""}
      </span>
    </Button>
  );
}
