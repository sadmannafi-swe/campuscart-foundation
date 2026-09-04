import { createFileRoute, useParams } from "@tanstack/react-router";
import { SellerShell } from "@/components/seller/SellerShell";
import { ProductForm } from "@/components/seller/ProductForm";
import { useSellerAccount, useSellerProducts } from "@/lib/seller";

export const Route = createFileRoute("/sell/dashboard/products/$productId")({
  component: EditProduct,
});

function EditProduct() {
  const { productId } = useParams({ from: "/sell/dashboard/products/$productId" });
  const { store } = useSellerAccount();
  const { data: products = [], isLoading } = useSellerProducts(store?.id);
  const product = products.find((p) => p.id === productId);

  return (
    <SellerShell title="Edit Product">
      <h2 className="mb-3 text-base font-bold">Edit Product</h2>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && !product && (
        <p className="text-sm text-muted-foreground">This product no longer exists.</p>
      )}
      {product && <ProductForm product={product} />}
    </SellerShell>
  );
}
