import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { categories } from "@/data/marketplace";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — DIU CampusCart" },
      { name: "description", content: "Explore every product category on the DIU CampusCart marketplace." },
      { property: "og:title", content: "Categories — DIU CampusCart" },
      { property: "og:description", content: "Explore every product category on DIU CampusCart." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <SiteLayout>
      <div className="container-page py-8">
        <BackButton className="mb-3" />
        <PageBreadcrumb items={[{ label: "Home", to: "/" }, { label: "Categories" }]} />
        <h1 className="text-2xl font-extrabold sm:text-3xl">All categories</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything the DIU community buys and sells, organised in one place.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to="/products"
              search={{ category: category.slug, q: undefined, sort: undefined }}
              className="card-surface flex flex-col gap-3 p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <CategoryIcon name={category.icon} className="size-6" />
              </span>
              <span className="text-sm font-semibold">{category.name}</span>
              <span className="text-xs text-muted-foreground">{category.productCount} listings</span>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
