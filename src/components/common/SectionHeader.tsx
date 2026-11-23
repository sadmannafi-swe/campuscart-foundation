import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Reveal className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="min-w-0">
        {eyebrow && <span className="text-xs font-medium text-bloom-ink">{eyebrow}</span>}
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </Reveal>
  );
}
