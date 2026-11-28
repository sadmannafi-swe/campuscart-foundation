import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BrandImage } from "@/components/brand/BrandImage";
import { Wordmark } from "@/components/brand/BloomMark";
import { brandAssets } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Show the wordmark text next to the mark (the mark already contains it). */
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}

const sizes = { sm: "h-9", md: "h-11", lg: "h-16" } as const;

/** The entrance plays once per visit, not on every page change. */
let introPlayed = false;

/**
 * The CampusCart logo, unchanged, with a quiet animation: the daffodil blooms in on
 * the first page of a visit, then every few seconds makes one slow 60° turn and rests
 * (it has six identical petals, so it always comes back to exactly the original mark).
 * It turns a little quicker on hover. The flower is the same image, clipped and
 * rotated about its exact centre; if it can't load, the plain logo shows.
 */
export function Logo({ className, size = "md", asLink = true }: LogoProps) {
  const [flowerReady, setFlowerReady] = useState(false);
  const [intro] = useState(() => !introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);

  // Navy lettering in light mode, cream lettering in dark mode.
  const image = (
    <span
      className={cn("cc-logo relative inline-flex", intro && "cc-logo-intro")}
      data-anim={flowerReady ? "on" : undefined}
    >
      <BrandImage
        fallback="CampusCart"
        fallbackNode={<Wordmark campus="DIU" />}
        src={brandAssets.logo}
        alt="DIU CampusCart — Your Campus. Your Marketplace."
        className={cn("cc-logo-base w-auto object-contain dark:hidden", sizes[size], className)}
        width={512}
        height={512}
      />
      <BrandImage
        fallback="CampusCart"
        fallbackNode={<Wordmark campus="DIU" />}
        src={brandAssets.logoDark}
        alt="DIU CampusCart — Your Campus. Your Marketplace."
        className={cn(
          "cc-logo-base hidden w-auto object-contain dark:block",
          sizes[size],
          className,
        )}
        width={512}
        height={512}
      />
      {/* the daffodil (identical in both themes), animated on its own layer */}
      <img
        src={brandAssets.logo}
        alt=""
        aria-hidden="true"
        draggable={false}
        onLoad={() => setFlowerReady(true)}
        onError={() => setFlowerReady(false)}
        className={cn(
          "cc-logo-flower pointer-events-none absolute left-0 top-0 w-auto object-contain",
          sizes[size],
          className,
        )}
      />
    </span>
  );

  if (!asLink) return image;

  return (
    <Link to="/diu" className="inline-flex shrink-0 items-center" aria-label="DIU CampusCart home">
      {image}
    </Link>
  );
}
