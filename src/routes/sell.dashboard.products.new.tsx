import { createFileRoute } from "@tanstack/react-router";
import { SellerShell } from "@/components/seller/SellerShell";
import { ProductForm } from "@/components/seller/ProductForm";

export const Route = createFileRoute("/sell/dashboard/products/new")({
  component: AddProduct,
});

function AddProduct() {
  return (
    <SellerShell title="Add New Product">
      <h2 className="mb-3 text-base font-bold">Add New Product</h2>
      <ProductForm />
    </SellerShell>
  );
}
