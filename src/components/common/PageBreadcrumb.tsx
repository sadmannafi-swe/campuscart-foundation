import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface Crumb {
  label: string;
  to?: "/" | "/products" | "/stores" | "/categories";
}

export function PageBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <Breadcrumb className="mb-5">
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.label}>
            <BreadcrumbItem>
              {item.to && index < items.length - 1 ? (
                <Link to={item.to} className="transition-colors hover:text-primary">
                  {item.label}
                </Link>
              ) : (
                <BreadcrumbPage className="truncate">{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}

      </BreadcrumbList>
    </Breadcrumb>
  );
}
