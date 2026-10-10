import { createFileRoute, notFound } from "@tanstack/react-router";
import { BadgeCheck, CalendarDays, Clock, MapPin, Package } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { Rating } from "@/components/common/Rating";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { EmptyState } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLiveProducts } from "@/lib/liveCatalog";
import type { Product, Store } from "@/lib/types";
import { getProductsByStore, getStoreBySlug } from "@/data/marketplace";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/stores/$storeSlug")({
  loader: ({ params }) => {
    const store = getStoreBySlug(params.storeSlug);
    if (store) return { store, products: getProductsByStore(store.id), liveId: null };
    // seller-created stores are addressed by their id
    if (UUID_RE.test(params.storeSlug)) return { store: null, products: [], liveId: params.storeSlug };
    throw notFound();
  },
  head: ({ loaderData }) => {
    if (!loaderData || !loaderData.store) {
      if (loaderData?.liveId) return { meta: [{ title: "Campus store — CampusCart" }, { name: "description", content: "A verified student store on CampusCart." }, { property: "og:title", content: "Campus store — CampusCart" }, { property: "og:description", content: "A verified student store on CampusCart." }] };
      return { meta: [{ title: "Store unavailable — DIU CampusCart" }, { name: "robots", content: "noindex" }] };
    }
    const { store } = loaderData;
    return {
      meta: [
        { title: `${store.name} — DIU CampusCart` },
        { name: "description", content: store.description },
        { property: "og:title", content: `${store.name} — DIU CampusCart` },
        { property: "og:description", content: store.description },
      ],
    };
  },
  component: StoreDetailsPage,
});

function StoreDetailsPage() {
  const { store, products, liveId } = Route.useLoaderData();
  if (store) return <StoreView store={store} products={products} />;
  return <LiveStorePage id={liveId!} />;
}

function LiveStorePage({ id }: { id: string }) {
  const { data: live = [] } = useLiveProducts();
  const { data: row, isLoading } = useQuery({
    queryKey: ["live-store", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,category,description,created_at")
        .eq("id", id)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) {
    return <SiteLayout><div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div></SiteLayout>;
  }
  if (!row) {
    return <SiteLayout><div className="container-page py-8"><BackButton className="mb-3" /><EmptyState title="Store unavailable" description="This store isn't open on CampusCart right now." /></div></SiteLayout>;
  }
  const products = live.filter((p) => p.storeId === id);
  const store: Store = {
    id: row.id, slug: row.id, name: row.name, categorySlug: row.category, categoryName: row.category,
    description: row.description, rating: 0, reviewCount: 0, productCount: products.length, status: "open",
    location: "On campus", responseTime: "Usually within a day",
    joinedAt: new Date(row.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    verified: true, featured: false, accentFrom: "from-primary-soft", accentTo: "to-accent-soft",
    initials: row.name.slice(0, 2).toUpperCase(),
  };
  return <StoreView store={store} products={products} />;
}

function StoreView({ store, products }: { store: Store; products: Product[] }) {

  const info = [
    { icon: MapPin, label: "Location", value: store.location },
    { icon: Clock, label: "Response", value: store.responseTime },
    { icon: CalendarDays, label: "On CampusCart since", value: store.joinedAt },
    { icon: Package, label: "Listings", value: `${store.productCount} products` },
  ];

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <BackButton className="mb-3" />
        <PageBreadcrumb
          items={[{ label: "Home", to: "/" }, { label: "Stores", to: "/stores" }, { label: store.name }]}
        />

        <section className="card-surface overflow-hidden">
          <div className={cn("h-32 bg-gradient-to-r sm:h-44", store.accentFrom, store.accentTo)} />
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-12 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-4 sm:-mt-14">
              <div className="grid size-24 shrink-0 place-items-center rounded-3xl border border-border bg-surface text-2xl font-extrabold text-primary shadow-sm sm:size-28">
                {store.initials}
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="flex items-center gap-2 text-xl font-extrabold sm:text-3xl">
                  <span className="truncate">{store.name}</span>
                  {store.verified && (
                    <BadgeCheck className="size-5 shrink-0 text-accent" aria-label="Verified store" />
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">{store.categoryName}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Rating value={store.rating} reviewCount={store.reviewCount} size="md" />
              <StatusBadge status={store.status} />
              <Badge variant="secondary">{store.productCount} products</Badge>
            </div>

            <p className="mt-4 max-w-3xl text-sm text-muted-foreground">{store.description}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button>Follow store</Button>
              <Button variant="outline">Message seller</Button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {info.map((item) => (
            <div key={item.label} className="card-surface flex items-start gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="truncate text-sm font-semibold">{item.value}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold sm:text-2xl">Products from {store.name}</h2>
          <div className="mt-5">
            {products.length === 0 ? (
              <EmptyState
                title="No products listed yet"
                description="This store hasn't published any listings."
              />
            ) : (
              <ProductGrid products={products} />
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
