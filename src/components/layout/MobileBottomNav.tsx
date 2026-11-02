import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, MessageCircle, Package, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUnreadChatCounts } from "@/lib/chat";

const items = [
  { label: "Home", to: "/diu" as const, icon: Home },
  { label: "Categories", to: "/categories" as const, icon: LayoutGrid },
  { label: "Chat", to: "/chat" as const, icon: MessageCircle },
  { label: "Cart", to: "/cart" as const, icon: ShoppingCart },
  { label: "Orders", to: "/orders" as const, icon: Package },
  { label: "Profile", to: "/account" as const, icon: User },
];

export function MobileBottomNav() {
  const { user } = useAuth();
  const { data: unreadCounts } = useUnreadChatCounts(user?.id);
  const unreadTotal = unreadCounts ? Object.values(unreadCounts).reduce((sum, n) => sum + n, 0) : 0;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-6">
        {items.map(({ label, to, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/diu" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium"
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden="true" />
                {label === "Chat" && unreadTotal > 0 && (
                  <span className="absolute -right-1.5 -top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-accent-foreground">
                    {unreadTotal > 9 ? "9+" : unreadTotal}
                  </span>
                )}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
