import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/commerce/ProductCard";
import { cn } from "@/lib/utils";

/** Horizontal scrolling rail on small screens, dense grid from `sm` upwards. */
export function ProductRail({
  products,
  className,
}: {
  products: Product[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} className="w-[46vw] shrink-0 sm:w-auto" />
      ))}
    </div>
  );
}
