import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";
import { getStoreById } from "@/data/marketplace";
import { discountPercent, formatPrice } from "@/lib/format";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { categories } from "@/data/marketplace";
import { cn } from "@/lib/utils";
import { useImageFallback } from "@/lib/useImageFallback";
import { cart } from "@/lib/cart";
import { flyToCart, useTilt } from "@/lib/motion";

/** Each category gets one quiet tint, so a photo-less listing still reads at a glance. */
const categoryTint: Record<string, string> = {
  textbooks: "bg-bloom-soft text-bloom-ink",
  stationery: "bg-bloom-soft text-bloom-ink",
  electronics: "bg-primary-soft text-primary",
  services: "bg-primary-soft text-primary",
  fashion: "bg-accent-soft text-accent",
  sports: "bg-accent-soft text-accent",
  food: "bg-secondary text-warning",
  hostel: "bg-secondary text-muted-foreground",
};

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const store = getStoreById(product.storeId);
  const category = categories.find((c) => c.slug === product.categorySlug);
  const discount = discountPercent(product.price, product.originalPrice);
  const img = useImageFallback(product.image);
  const addRef = useRef<HTMLButtonElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<number>(0);
  useEffect(() => () => clearTimeout(addedTimer.current), []);
  const tilt = useTilt<HTMLElement>(5);
  const quickAdd = product.inStock && !(product.variants && product.variants.length > 0);

  return (
    <article
      ref={tilt}
      className={cn(
        "focus-item group relative flex flex-col overflow-hidden rounded-[16px] border border-border bg-surface transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-bloom)] [transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] hover:[transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))_translateY(-4px)] hover:border-foreground/15 hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      {/* soft sheen that follows the pointer while the card tilts */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 [background:radial-gradient(240px_circle_at_var(--gx,50%)_var(--gy,50%),rgb(255_255_255/0.22),transparent_60%)] group-hover:opacity-100"
      />
      <div
        ref={mediaRef}
        className={cn(
          "relative grid aspect-4/3 place-items-center overflow-hidden",
          categoryTint[product.categorySlug] ?? "bg-muted text-muted-foreground",
        )}
      >
        {img.showImage ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={img.onError}
            className="size-full object-cover transition-transform duration-700 ease-[var(--ease-bloom)] group-hover:scale-[1.04]"
          />
        ) : (
          <>
            <span
              className="absolute -right-6 -top-6 size-28 rounded-full border-[14px] border-current opacity-[0.07]"
              aria-hidden="true"
            />
            <CategoryIcon
              name={category?.icon ?? "Tag"}
              className="size-10 stroke-[1.25] transition-transform duration-500 ease-[var(--ease-bloom)] group-hover:-rotate-6 group-hover:scale-110"
            />
          </>
        )}

        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
          {discount && (
            <span className="rounded-[6px] bg-ink px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink-foreground">
              −{discount}%
            </span>
          )}
          {product.tags.includes("new") && !discount && (
            <span className="rounded-[6px] bg-bloom px-1.5 py-0.5 text-[11px] font-semibold text-bloom-foreground">
              New
            </span>
          )}
          {!product.inStock && (
            <span className="rounded-[6px] bg-surface/90 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              Out of stock
            </span>
          )}
        </div>

        {quickAdd && (
          <button
            ref={addRef}
            type="button"
            aria-label={`Add ${product.name} to cart`}
            onClick={() => {
              cart.add(product, 1);
              flyToCart(addRef.current, img.showImage ? product.image : null);
              toast.success("Added to cart");
              setAdded(true);
              clearTimeout(addedTimer.current);
              addedTimer.current = window.setTimeout(() => setAdded(false), 1600);
            }}
            className={cn(
              "absolute bottom-2.5 right-2.5 z-10 grid size-9 cursor-pointer place-items-center rounded-full shadow-[0_6px_16px_oklch(0.22_0.05_265/20%)] transition-[transform,opacity,background-color,color] duration-300 ease-[var(--ease-bloom)] active:scale-90 md:focus-visible:translate-y-0 md:focus-visible:opacity-100",
              added
                ? "bg-accent text-white md:translate-y-0 md:opacity-100"
                : "bg-ink text-ink-foreground hover:bg-bloom hover:text-bloom-foreground md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100",
            )}
          >
            {added ? (
              <Check key="added" className="atc-pop size-4" strokeWidth={3} aria-hidden="true" />
            ) : (
              <Plus key="add" className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-snug">
          <Link
            to="/products/$productSlug"
            params={{ productSlug: product.slug }}
            onClick={() => {
              // Only the tapped card's photo grows into the product page photo.
              const el = mediaRef.current;
              if (!el) return;
              el.style.viewTransitionName = "product-hero";
              window.setTimeout(() => (el.style.viewTransitionName = ""), 1200);
            }}
          >
            <span className="absolute inset-0" aria-hidden="true" />
            {product.name}
          </Link>
        </h3>

        <div className="flex items-baseline gap-1.5">
          <span className="price-lg text-base text-foreground">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-xs tabular-nums text-muted-foreground line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0 whitespace-nowrap">
            {product.reviewCount > 0 ? (
              <>
                <span className="text-bloom-ink">★</span>{" "}
                <span className="tabular-nums text-foreground">{product.rating.toFixed(1)}</span>
              </>
            ) : (
              "New listing"
            )}
          </span>
          <span className="shrink-0 text-foreground/20">·</span>
          <span className="truncate">{product.storeName ?? store?.name}</span>
        </div>
      </div>
    </article>
  );
}
