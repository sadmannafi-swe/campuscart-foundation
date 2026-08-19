import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { getProductsByTag } from "@/data/marketplace";

export const Route = createFileRoute("/new-arrivals")({
  head: () => ({
    meta: [
      { title: "New Arrivals — DIU CampusCart" },
      { name: "description", content: "The newest student listings on the DIU CampusCart marketplace." },
      { property: "og:title", content: "New Arrivals — DIU CampusCart" },
      { property: "og:description", content: "Freshly listed products from DIU campus stores." },
    ],
  }),
  component: NewArrivalsPage,
});

function NewArrivalsPage() {
  const items = getProductsByTag("new");
  return (
    <SiteLayout>
      <div className="container-page py-8">
        <PageBreadcrumb items={[{ label: "Home", to: "/" }, { label: "New arrivals" }]} />
        <h1 className="text-2xl font-extrabold sm:text-3xl">New arrivals</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {items.length} listings published recently by campus sellers.
        </p>
        <div className="mt-8">
          <ProductGrid products={items} />
        </div>
      </div>
    </SiteLayout>
  );
}
