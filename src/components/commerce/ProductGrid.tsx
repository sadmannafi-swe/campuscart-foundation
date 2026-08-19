import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/commerce/ProductCard";
import { cn } from "@/lib/utils";

export function ProductGrid({
  products,
  className,
}: {
  products: Product[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
