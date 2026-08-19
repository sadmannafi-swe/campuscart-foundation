import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, Check, Heart, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { Rating } from "@/components/common/Rating";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { discountPercent, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  categories,
  getProductBySlug,
  getRelatedProducts,
  getStoreById,
} from "@/data/marketplace";

export const Route = createFileRoute("/products/$productSlug")({
  loader: ({ params }) => {
    const product = getProductBySlug(params.productSlug);
    if (!product) throw notFound();
    const store = getStoreById(product.storeId)!;
    return { product, store, related: getRelatedProducts(product) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product unavailable — DIU CampusCart" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { product } = loaderData;
    return {
      meta: [
        { title: `${product.name} — DIU CampusCart` },
        { name: "description", content: product.description.slice(0, 155) },
        { property: "og:title", content: `${product.name} — DIU CampusCart` },
        { property: "og:description", content: product.description.slice(0, 155) },
      ],
    };
  },
  component: ProductDetailsPage,
});

function ProductDetailsPage() {
  const { product, store, related } = Route.useLoaderData();
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries((product.variants ?? []).map((v) => [v.id, v.options[0]!])),
  );

  const category = categories.find((c) => c.slug === product.categorySlug);
  const discount = discountPercent(product.price, product.originalPrice);

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <PageBreadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Products", to: "/products" },
            { label: product.name },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div
              className={cn(
                "grid aspect-square w-full place-items-center rounded-3xl border border-border bg-gradient-to-br",
                product.accentFrom,
                product.accentTo,
              )}
            >
              <CategoryIcon name={category?.icon ?? "Tag"} className="size-24 text-primary/70" />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "grid aspect-square place-items-center rounded-xl border border-border bg-gradient-to-br",
                    product.accentFrom,
                    product.accentTo,
                  )}
                >
                  <CategoryIcon name={category?.icon ?? "Tag"} className="size-6 text-primary/60" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{category?.name}</Badge>
              <Badge variant="secondary" className="capitalize">
                {product.condition.replace("-", " ")}
              </Badge>
              {product.inStock ? (
                <span className="text-xs font-semibold text-accent">In stock</span>
              ) : (
                <span className="text-xs font-semibold text-destructive">Out of stock</span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{product.name}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Rating value={product.rating} reviewCount={product.reviewCount} size="md" />
              <span className="text-sm text-muted-foreground">
                {product.reviewCount} verified reviews
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="price-lg text-3xl text-primary">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="text-base text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              {discount && (
                <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground">
                  Save {discount}%
                </span>
              )}
            </div>

            <Link
              to="/stores/$storeSlug"
              params={{ storeSlug: store.slug }}
              className="card-surface mt-6 flex items-center gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-card-hover)]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm font-extrabold text-primary">
                {store.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  {store.name}
                  {store.verified && <BadgeCheck className="size-4 text-accent" aria-hidden="true" />}
                </span>
                <span className="text-xs text-muted-foreground">{store.responseTime}</span>
              </span>
              <Rating value={store.rating} showValue />
            </Link>

            {product.variants?.map((variant) => (
              <div key={variant.id} className="mt-6">
                <p className="text-sm font-semibold">{variant.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {variant.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelected((prev) => ({ ...prev, [variant.id]: option }))}
                      className={cn(
                        "cursor-pointer rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-primary",
                        selected[variant.id] === option &&
                          "border-primary bg-primary-soft font-semibold text-primary",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-full border border-border">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground hover:text-primary"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <span className="w-10 text-center text-sm font-semibold" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className="grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground hover:text-primary"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">Maximum 10 per order</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="flex-1 sm:flex-none"
                disabled={!product.inStock}
                onClick={() => toast.success("Added to cart")}
              >
                Add to Cart
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="flex-1 sm:flex-none"
                disabled={!product.inStock}
                onClick={() => toast("Checkout arrives in a later phase")}
              >
                Buy Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                aria-label="Add to wishlist"
                onClick={() => toast.success("Saved to your wishlist")}
              >
                <Heart />
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Truck, text: "Free campus pickup, same day" },
                { icon: ShieldCheck, text: "7-day return window" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className="size-4 text-accent" aria-hidden="true" />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Tabs defaultValue="description" className="mt-12">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="highlights">Highlights</TabsTrigger>
            <TabsTrigger value="seller">Seller</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="card-surface mt-4 p-6 text-sm text-muted-foreground">
            {product.description}
          </TabsContent>
          <TabsContent value="highlights" className="card-surface mt-4 p-6">
            <ul className="grid gap-3 sm:grid-cols-2">
              {product.highlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-accent" aria-hidden="true" />
                  {highlight}
                </li>
              ))}
            </ul>
          </TabsContent>
          <TabsContent value="seller" className="card-surface mt-4 p-6 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{store.name}</p>
            <p className="mt-1">{store.description}</p>
            <p className="mt-3">
              {store.location} · {store.responseTime} · On CampusCart since {store.joinedAt}
            </p>
          </TabsContent>
        </Tabs>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold sm:text-2xl">You may also like</h2>
            <div className="mt-5">
              <ProductGrid products={related} />
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
