import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/commerce/ProductCard";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";

/** Horizontal scrolling rail on small screens, dense grid from `sm` upwards. */
export function ProductRail({ products, className }: { products: Product[]; className?: string }) {
  return (
    <div
      className={cn(
        "focus-group -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-6 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {products.map((product, i) => (
        <Reveal
          key={product.id}
          delay={(i % 6) * 60}
          className="w-[46vw] shrink-0 snap-start sm:w-auto"
        >
          <ProductCard product={product} className="h-full" />
        </Reveal>
      ))}
    </div>
  );
}
