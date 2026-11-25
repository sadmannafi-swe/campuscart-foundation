import { Link } from "@tanstack/react-router";
import { Home, MessageCircle, Package, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUnreadChatCounts } from "@/lib/chat";
import { useTypingOnTouch } from "@/lib/useTypingOnTouch";
import { cn } from "@/lib/utils";

/** Exactly six items. Pre-Owned took the place of Categories (still in the header menu). */
const items = [
  { label: "Home", to: "/diu" as const, icon: Home },
  { label: "Orders", to: "/orders" as const, icon: Package },
  { label: "Messages", to: "/chat" as const, icon: MessageCircle },
  { label: "Pre-Owned", to: "/preowned" as const, icon: ShoppingBag },
  { label: "Cart", to: "/cart" as const, icon: ShoppingCart },
  { label: "Profile", to: "/account" as const, icon: User },
];

export function MobileBottomNav() {
  const { user } = useAuth();
  const { data: unreadCounts } = useUnreadChatCounts(user?.id);
  // hidden while the on-screen keyboard is up, so it never covers the field being typed in
  const typing = useTypingOnTouch();
  const unreadTotal = unreadCounts ? Object.values(unreadCounts).reduce((sum, n) => sum + n, 0) : 0;

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden",
        typing && "hidden",
      )}
    >
      <ul className="grid grid-cols-6">
        {items.map(({ label, to, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/diu" }}
              activeProps={{ className: "text-foreground [&_.nav-dot]:scale-100" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors"
            >
              <span
                className="nav-dot absolute top-1 h-[3px] w-5 scale-0 rounded-full bg-bloom transition-transform duration-300 ease-[var(--ease-bloom)]"
                aria-hidden="true"
              />
              <span className="relative" {...(label === "Cart" ? { "data-cart-target": "" } : {})}>
                <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                {label === "Messages" && unreadTotal > 0 && (
                  <span className="absolute -right-1.5 -top-1 grid min-w-4 place-items-center rounded-full bg-bloom px-1 text-[10px] font-semibold leading-4 text-bloom-foreground">
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
