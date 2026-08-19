import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";
import { getStoreById } from "@/data/marketplace";
import { discountPercent, formatPrice } from "@/lib/format";
import { Rating } from "@/components/common/Rating";
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
        "card-surface group relative flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      <Link
        to="/products/$productSlug"
        params={{ productSlug: product.slug }}
        className="relative block"
        tabIndex={-1}
        aria-hidden="true"
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
            className="size-10 text-primary/70 transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </Link>

      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        {discount && (
          <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
            -{discount}%
          </span>
        )}
        {product.tags.includes("new") && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
            New
          </span>
        )}
        {!product.inStock && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            Out of stock
          </span>
        )}
      </div>

      <button
        type="button"
        aria-label={`Add ${product.name} to wishlist`}
        onClick={() => toast.success("Saved to your wishlist")}
        className="absolute right-3 top-3 grid size-9 cursor-pointer place-items-center rounded-full bg-surface/90 text-muted-foreground shadow-sm transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Heart className="size-4" aria-hidden="true" />
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {store && (
          <Link
            to="/stores/$storeSlug"
            params={{ storeSlug: store.slug }}
            className="truncate text-xs font-semibold text-primary hover:underline"
          >
            {store.name}
          </Link>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          <Link to="/products/$productSlug" params={{ productSlug: product.slug }}>
            <span className="absolute inset-0" aria-hidden="true" />
            {product.name}
          </Link>
        </h3>
        <Rating value={product.rating} reviewCount={product.reviewCount} />
        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-1">
          <span className="price-lg text-lg text-foreground">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
