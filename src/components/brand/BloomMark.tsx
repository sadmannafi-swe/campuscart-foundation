import { cn } from "@/lib/utils";

/**
 * The CampusCart daffodil: six petals around a trumpet. Drawn in code so it stays
 * sharp at every size. `animate` unfurls the petals once on mount.
 */
export function BloomMark({
  className,
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("shrink-0", className)}>
      <g transform="translate(24 24)">
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <path
              d="M0 -4 C 6 -9, 7 -17, 0 -22 C -7 -17, -6 -9, 0 -4 Z"
              fill="var(--color-bloom)"
              style={
                animate
                  ? {
                      transformOrigin: "0 0",
                      animation: `cc-petal 700ms var(--ease-bloom) ${120 + i * 60}ms both`,
                    }
                  : undefined
              }
            />
          </g>
        ))}
        <circle r="7.5" fill="var(--color-bloom-ink)" />
        <circle r="4" fill="var(--color-ink)" />
      </g>
    </svg>
  );
}

/** Wordmark used until the real logo file is added to public/brand. */
export function Wordmark({ className, campus }: { className?: string; campus?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BloomMark className="size-8" />
      <span className="font-display text-[19px] font-semibold leading-none tracking-[-0.02em] text-foreground">
        CampusCart
        {campus ? (
          <span className="ml-1.5 align-middle font-sans text-xs font-medium tracking-normal text-muted-foreground">
            {campus}
          </span>
        ) : null}
      </span>
    </span>
  );
}
