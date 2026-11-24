import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { EmptyState } from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { getProductsByTag } from "@/data/marketplace";
import { useLiveProducts } from "@/lib/liveCatalog";

export const Route = createFileRoute("/new-arrivals")({
  head: () => ({
    meta: [
      { title: "New Arrivals — DIU CampusCart" },
      {
        name: "description",
        content: "The newest student listings on the DIU CampusCart marketplace.",
      },
      { property: "og:title", content: "New Arrivals — DIU CampusCart" },
      { property: "og:description", content: "Freshly listed products from DIU campus stores." },
    ],
  }),
  component: NewArrivalsPage,
});

function NewArrivalsPage() {
  const { data: live = [], isLoading } = useLiveProducts();
  const items = [...live, ...getProductsByTag("new")];
  return (
    <SiteLayout>
      <div className="container-page py-8">
        <BackButton className="mb-3" />
        <PageBreadcrumb items={[{ label: "Home", to: "/" }, { label: "New arrivals" }]} />
        <h1 className="text-2xl font-semibold sm:text-3xl">New arrivals</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {items.length} listings published recently by campus sellers.
        </p>
        <div className="mt-8">
          {items.length === 0 && !isLoading ? (
            <EmptyState
              title="No new listings yet"
              description="Fresh listings from campus sellers will appear here."
            />
          ) : (
            <ProductGrid products={items} />
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
