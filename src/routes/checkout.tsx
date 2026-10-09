import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { ItemThumb } from "@/components/commerce/ItemThumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cart, productToCartItem, useCart, type CartItem } from "@/lib/cart";
import { useCatalogProducts } from "@/lib/liveCatalog";
import { formatPrice } from "@/lib/format";

interface CheckoutSearch {
  buy?: string | undefined;
  qty?: number | undefined;
}

export const Route = createFileRoute("/checkout")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): CheckoutSearch => ({
    buy: typeof s["buy"] === "string" ? s["buy"] : undefined,
    qty: Number.isFinite(Number(s["qty"])) ? Number(s["qty"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Checkout — CampusCart" },
      { name: "description", content: "Confirm your delivery details and place your CampusCart order." },
      { property: "og:title", content: "Checkout — CampusCart" },
      { property: "og:description", content: "Confirm your delivery details and place your order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { buy, qty } = Route.useSearch();
  const { user, profile, loading } = useAuth();
  const { items: cartItems } = useCart();
  const { products, isLoading: productsLoading } = useCatalogProducts();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Buy Now: a single product held only on this page — never added to the cart.
  const buyProduct = buy ? products.find((p) => p.slug === buy) : undefined;
  const [buyQty, setBuyQty] = useState(Math.max(1, Math.min(10, qty ?? 1)));

  const items: CartItem[] = useMemo(
    () => (buy ? (buyProduct ? [productToCartItem(buyProduct, buyQty)] : []) : cartItems),
    [buy, buyProduct, buyQty, cartItems],
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName((v) => v || profile.full_name);
    setPhone((v) => v || profile.phone);
  }, [profile]);

  const orderable = items.filter((i) => i.live);
  const demo = items.filter((i) => !i.live);
  const subtotal = orderable.reduce((n, i) => n + i.price * i.quantity, 0);
  const total = subtotal;

  const setQty = (item: CartItem, q: number) =>
    buy ? setBuyQty(Math.max(1, Math.min(10, q))) : cart.setQuantity(item.productId, q);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (orderable.length === 0) return;
    if (name.trim().length < 2 || phone.trim().length < 6 || address.trim().length < 3) {
      toast.error("Please fill in your name, phone and delivery address.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("place_order", {
        _items: orderable.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        _name: name.trim(),
        _phone: phone.trim(),
        _address: address.trim(),
        _note: note.trim(),
      });
      if (error) throw error;
      if (!buy) cart.removeMany(orderable.map((i) => i.productId));
      await queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
      toast.success("Order placed");
      void navigate({ to: "/order-confirmation", search: { ids: (data ?? []).join(",") }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place the order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <div className="container-page py-6">
        <BackButton className="mb-3" />
        <h1 className="text-2xl font-extrabold">Checkout</h1>

        {loading || (buy && productsLoading) ? (
          <div className="mt-10 grid place-items-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="card-surface mt-6 p-8 text-center">
            <p className="font-semibold">Log in to place your order</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "login" }}>Log in</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/auth" search={{ mode: "signup" }}>Create account</Link>
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="card-surface mt-6 p-8 text-center">
            <p className="font-semibold">Nothing to check out</p>
            <Button asChild size="sm" className="mt-4">
              <Link to="/products" search={{}}>Browse products</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="space-y-5">
              <section className="card-surface p-4">
                <h2 className="text-base font-bold">Order items</h2>
                <ul className="mt-3 divide-y divide-border">
                  {items.map((item) => (
                    <li key={item.productId} className="flex gap-3 py-3">
                      <ItemThumb path={item.imagePath} alt={item.name} className="size-14" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.storeName}</p>
                        {!item.live && (
                          <p className="mt-1 text-xs font-semibold text-destructive">
                            Sample listing — can't be ordered.
                          </p>
                        )}
                        <div className="mt-2 flex items-center rounded-full border border-border w-fit">
                          <button type="button" aria-label="Decrease quantity" onClick={() => setQty(item, item.quantity - 1)} className="grid size-8 place-items-center text-muted-foreground hover:text-primary">
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                          <button type="button" aria-label="Increase quantity" onClick={() => setQty(item, item.quantity + 1)} className="grid size-8 place-items-center text-muted-foreground hover:text-primary">
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-sm">
                        <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(item.price)} each</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card-surface space-y-3 p-4">
                <h2 className="text-base font-bold">Delivery information</h2>
                <div className="space-y-1.5">
                  <Label htmlFor="co-name">Full name</Label>
                  <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-phone">Phone number</Label>
                  <Input id="co-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-address">Delivery address / campus pickup point</Label>
                  <Textarea id="co-address" value={address} onChange={(e) => setAddress(e.target.value.slice(0, 300))} rows={3} placeholder="Hall, room, building or pickup spot" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-note">Note for the seller (optional)</Label>
                  <Input id="co-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
                </div>
              </section>
            </div>

            <aside className="card-surface space-y-2 p-4 text-sm">
              <h2 className="text-base font-bold">Summary</h2>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <span className="font-bold">Final Total</span>
                <span className="font-extrabold">{formatPrice(total)}</span>
              </div>
              {demo.length > 0 && orderable.length > 0 && (
                <p className="text-xs text-muted-foreground">Sample listings are left in your cart.</p>
              )}
              <Button type="submit" className="mt-2 w-full" disabled={busy || orderable.length === 0}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Place Order
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">Pay the seller on delivery or pickup.</p>
            </aside>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}
