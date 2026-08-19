import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";
import { getStoreById } from "@/data/marketplace";
import { discountPercent, formatPrice } from "@/lib/format";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { categories } from "@/data/marketplace";
import { cn } from "@/lib/utils";

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const store = getStoreById(product.storeId);
  const category = categories.find((c) => c.slug === product.categorySlug);
  const discount = discountPercent(product.price, product.originalPrice);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      <div
        className={cn(
          "grid aspect-4/3 place-items-center bg-gradient-to-br",
          product.accentFrom,
          product.accentTo,
        )}
      >
        <CategoryIcon
          name={category?.icon ?? "Tag"}
          className="size-8 text-primary/70 transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
        {discount && (
          <span className="rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
            -{discount}%
          </span>
        )}
        {product.tags.includes("new") && !discount && (
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
            New
          </span>
        )}
        {!product.inStock && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
            Out of stock
          </span>
        )}
      </div>

      <button
        type="button"
        aria-label={`Add ${product.name} to wishlist`}
        onClick={() => toast.success("Saved to your wishlist")}
        className="absolute right-2 top-2 z-10 grid size-7 cursor-pointer place-items-center rounded-full bg-surface/90 text-muted-foreground shadow-sm transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Heart className="size-3.5" aria-hidden="true" />
      </button>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 min-h-8 text-[13px] font-semibold leading-tight">
          <Link to="/products/$productSlug" params={{ productSlug: product.slug }}>
            <span className="absolute inset-0" aria-hidden="true" />
            {product.name}
          </Link>
        </h3>

        <div className="flex items-baseline gap-1.5">
          <span className="price-lg text-sm text-foreground">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-[11px] text-muted-foreground line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
          <span className="shrink-0 whitespace-nowrap font-semibold text-warning">★ {product.rating.toFixed(1)}</span>
          <span className="shrink-0 text-border">|</span>
          <span className="truncate">{store?.name}</span>
        </div>
      </div>
    </article>
  );
}
