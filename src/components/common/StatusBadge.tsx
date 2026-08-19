import { cn } from "@/lib/utils";
import type { StoreStatus } from "@/lib/types";

const statusMap: Record<StoreStatus, { label: string; className: string }> = {
  open: { label: "Open now", className: "bg-accent-soft text-accent" },
  busy: { label: "Busy", className: "bg-warning/15 text-warning-foreground" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status, className }: { status: StoreStatus; className?: string }) {
  const { label, className: tone } = statusMap[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tone,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
