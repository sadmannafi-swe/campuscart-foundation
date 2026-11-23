import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/commerce/ProductCard";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";

export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
        className,
      )}
    >
      {products.map((product, i) => (
        <Reveal key={product.id} delay={(i % 5) * 60} className="h-full">
          <ProductCard product={product} className="h-full" />
        </Reveal>
      ))}
    </div>
  );
}
