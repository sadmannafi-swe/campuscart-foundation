import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { ItemThumb } from "@/components/commerce/ItemThumb";
import { Button } from "@/components/ui/button";
import { cart, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — DIU CampusCart" },
      { name: "description", content: "Review the campus listings you're ready to order." },
      { property: "og:title", content: "Your Cart — DIU CampusCart" },
      { property: "og:description", content: "Review the campus listings you're ready to order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, count, subtotal } = useCart();

  return (
    <SiteLayout>
      <div className="container-page py-6">
        <BackButton className="mb-3" />
        <h1 className="text-2xl font-extrabold">Your cart</h1>

        {items.length === 0 ? (
          <div className="card-surface mt-6 grid place-items-center gap-3 p-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
              <ShoppingCart className="size-6" aria-hidden="true" />
            </span>
            <p className="font-semibold">Your cart is empty</p>
            <Button asChild size="sm">
              <Link to="/products" search={{}}>Browse products</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.productId} className="card-surface flex gap-3 p-3">
                  <ItemThumb path={item.imagePath} alt={item.name} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/products/$productSlug"
                      params={{ productSlug: item.slug }}
                      className="line-clamp-2 text-sm font-semibold hover:text-primary"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.storeName}</p>
                    <p className="mt-1 text-sm font-bold">{formatPrice(item.price)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-border">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => cart.setQuantity(item.productId, item.quantity - 1)}
                          className="grid size-8 place-items-center text-muted-foreground hover:text-primary"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => cart.setQuantity(item.productId, item.quantity + 1)}
                          className="grid size-8 place-items-center text-muted-foreground hover:text-primary"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => cart.remove(item.productId)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold">{formatPrice(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>

            <aside className="card-surface p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({count} items)</span>
                <span className="font-bold">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Shipping is calculated at checkout.</p>
              <Button asChild className="mt-4 w-full">
                <Link to="/checkout" search={{}}>Proceed to Checkout</Link>
              </Button>
            </aside>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
