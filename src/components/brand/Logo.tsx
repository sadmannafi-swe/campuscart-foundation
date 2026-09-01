import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/campuscart-logo.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Show the wordmark text next to the mark (the mark already contains it). */
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}

const sizes = { sm: "h-9", md: "h-11", lg: "h-16" } as const;

export function Logo({ className, size = "md", asLink = true }: LogoProps) {
  const image = (
    <img
      src={logoAsset.url}
      alt="DIU CampusCart — Your Campus. Your Marketplace."
      className={cn("w-auto object-contain", sizes[size], className)}
      width={512}
      height={512}
    />
  );

  if (!asLink) return image;

  return (
    <Link to="/diu" className="inline-flex shrink-0 items-center" aria-label="DIU CampusCart home">
      {image}
    </Link>
  );
}
