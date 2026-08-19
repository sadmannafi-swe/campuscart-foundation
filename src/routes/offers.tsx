import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { getProductsByTag } from "@/data/marketplace";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Student Offers — DIU CampusCart" },
      { name: "description", content: "Discounted textbooks, gadgets and hostel kits from verified DIU campus stores." },
      { property: "og:title", content: "Student Offers — DIU CampusCart" },
      { property: "og:description", content: "Live discounts from verified DIU campus stores." },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const offers = getProductsByTag("offer");
  return (
    <SiteLayout>
      <div className="container-page py-8">
        <PageBreadcrumb items={[{ label: "Home", to: "/" }, { label: "Offers" }]} />
        <h1 className="text-2xl font-extrabold sm:text-3xl">Student offers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {offers.length} discounted listings, updated every semester week.
        </p>
        <div className="mt-8">
          <ProductGrid products={offers} />
        </div>
      </div>
    </SiteLayout>
  );
}
