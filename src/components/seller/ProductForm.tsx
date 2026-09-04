import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/marketplace";
import {
  productConditions,
  uploadSellerFile,
  useSellerAccount,
  type SellerProduct,
} from "@/lib/seller";

export function ProductForm({ product }: { product?: SellerProduct }) {
  const { store } = useSellerAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [condition, setCondition] = useState(product?.condition ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [inStock, setInStock] = useState(product?.in_stock ?? true);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!store) return;
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, 3)) {
        try {
          uploaded.push(await uploadSellerFile(store.user_id, file, "product"));
        } catch {
          /* ignore a failed image, keep the product */
        }
      }
      const existing = ((product?.images as string[] | null) ?? []).concat(uploaded);

      const payload = {
        store_id: store.id,
        user_id: store.user_id,
        university_slug: store.university_slug,
        name: name.trim(),
        category,
        price: Number(price),
        condition,
        description: description.trim(),
        images: existing,
        in_stock: inStock,
      };

      const { error } = product
        ? await supabase.from("seller_products").update(payload).eq("id", product.id)
        : await supabase.from("seller_products").insert(payload);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["seller-products", store.id] });
      toast.success(product ? "Product updated" : "Product published");
      void navigate({ to: "/sell/dashboard/products" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-surface space-y-4 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="p-images">Product Images</Label>
        <label
          htmlFor="p-images"
          className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/30 text-xs font-medium text-primary"
        >
          <ImagePlus className="size-5" aria-hidden="true" />
          {files.length > 0 ? `${files.length} image(s) selected` : "Add Images"}
        </label>
        <input
          id="p-images"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="p-name">Product Name</Label>
        <Input
          id="p-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter product name"
          maxLength={80}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="p-price">Price (৳)</Label>
        <Input
          id="p-price"
          type="number"
          min={0}
          step="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Enter price"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Condition</Label>
        <Select value={condition} onValueChange={setCondition} required>
          <SelectTrigger>
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            {productConditions.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "new" ? "New" : c === "like-new" ? "Like new" : "Used"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="p-desc">Description</Label>
        <Textarea
          id="p-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          placeholder="Describe your product"
          rows={4}
        />
        <p className="text-right text-[11px] text-muted-foreground">{description.length}/500</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => setInStock(e.target.checked)}
          className="size-4 accent-current text-primary"
        />
        In stock
      </label>

      <Button type="submit" className="w-full" disabled={busy || !category || !condition}>
        {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
        {product ? "Save Changes" : "Publish Product"}
      </Button>
    </form>
  );
}
