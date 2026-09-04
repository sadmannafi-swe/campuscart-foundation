import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { SellerShell } from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { useSellerAccount, useSellerProducts, useSignedUrl, type SellerProduct } from "@/lib/seller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sell/dashboard/products/")({
  component: SellerProducts,
});

type Filter = "all" | "active" | "inactive";

function SellerProducts() {
  const { store } = useSellerAccount();
  const { data: products = [], isLoading } = useSellerProducts(store?.id);
  const [filter, setFilter] = useState<Filter>("all");
  const queryClient = useQueryClient();

  const active = products.filter((p) => p.is_active);
  const inactive = products.filter((p) => !p.is_active);
  const shown = filter === "all" ? products : filter === "active" ? active : inactive;

  async function toggleActive(product: SellerProduct) {
    const { error } = await supabase
      .from("seller_products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);
    if (error) toast.error(error.message);
    else {
      toast.success(product.is_active ? "Product deactivated" : "Product activated");
      void queryClient.invalidateQueries({ queryKey: ["seller-products", store?.id] });
    }
  }

  async function remove(product: SellerProduct) {
    const { error } = await supabase.from("seller_products").delete().eq("id", product.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Product deleted");
      void queryClient.invalidateQueries({ queryKey: ["seller-products", store?.id] });
    }
  }

  const tabs: Array<{ id: Filter; label: string }> = [
    { id: "all", label: `All (${products.length})` },
    { id: "active", label: `Active (${active.length})` },
    { id: "inactive", label: `Inactive (${inactive.length})` },
  ];

  return (
    <SellerShell title="Products">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">My Products</h2>
        <Button asChild size="sm">
          <Link to="/sell/dashboard/products/new">
            <Plus className="mr-1 size-4" aria-hidden="true" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="mt-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading products…</p>}
        {!isLoading && shown.length === 0 && (
          <div className="card-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Package className="size-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold">No products yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first product to start selling on CampusCart.
            </p>
          </div>
        )}
        {shown.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            onToggle={() => toggleActive(product)}
            onDelete={() => remove(product)}
          />
        ))}
      </div>
    </SellerShell>
  );
}

function ProductRow({
  product,
  onToggle,
  onDelete,
}: {
  product: SellerProduct;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const images = (product.images as string[] | null) ?? [];
  const { data: url } = useSignedUrl(images[0] ?? null);
  return (
    <div className="card-surface flex items-center gap-3 p-3">
      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <Package className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        <p className="text-sm font-bold text-primary">{formatPrice(Number(product.price))}</p>
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-1 text-[11px] font-semibold",
          product.in_stock && product.is_active
            ? "bg-accent-soft text-accent"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {!product.is_active ? "Inactive" : product.in_stock ? "In Stock" : "Out of Stock"}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Product actions" className="grid size-8 place-items-center rounded-lg text-muted-foreground">
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to="/sell/dashboard/products/$productId" params={{ productId: product.id }}>
              Edit product
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggle}>
            {product.is_active ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
