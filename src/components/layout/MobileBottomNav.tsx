import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Package, ShoppingCart, User } from "lucide-react";

const items = [
  { label: "Home", to: "/diu" as const, icon: Home },
  { label: "Categories", to: "/categories" as const, icon: LayoutGrid },
  { label: "Cart", to: "/cart" as const, icon: ShoppingCart },
  { label: "Orders", to: "/orders" as const, icon: Package },
  { label: "Profile", to: "/account" as const, icon: User },
];

export function MobileBottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ label, to, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/diu" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium"
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
