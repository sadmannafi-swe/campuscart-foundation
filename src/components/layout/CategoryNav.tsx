import { Link } from "@tanstack/react-router";
import { categories } from "@/data/marketplace";
import { CategoryIcon } from "@/components/common/CategoryIcon";

export function CategoryNav() {
  return (
    <nav aria-label="Product categories" className="border-t border-border bg-surface">
      <div className="container-page">
        <ul className="flex gap-1 overflow-x-auto py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                to="/products"
                search={{ category: category.slug, q: undefined, sort: undefined }}
                className="flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <CategoryIcon name={category.icon} className="size-4" />
                <span className="whitespace-nowrap">{category.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
