import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  HelpCircle,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Receipt,
  Settings,
  Star,
  Store as StoreIcon,
  Wallet,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useSellerAccount, useSignedUrl } from "@/lib/seller";
import { cn } from "@/lib/utils";

const menu = [
  { label: "Dashboard", to: "/sell/dashboard" as const, icon: LayoutGrid },
  { label: "Products", to: "/sell/dashboard/products" as const, icon: Package },
  { label: "Orders", to: "/sell/dashboard/orders" as const, icon: Receipt },
  { label: "Store", to: "/sell/dashboard/store" as const, icon: StoreIcon },
  { label: "Earnings", to: "/sell/dashboard/earnings" as const, icon: Wallet },
  { label: "Reviews", to: "/sell/dashboard/reviews" as const, icon: Star },
  { label: "Notifications", to: "/sell/dashboard/notifications" as const, icon: Bell },
  { label: "Help & Support", to: "/sell/dashboard/help" as const, icon: LifeBuoy },
  { label: "Settings", to: "/sell/dashboard/settings" as const, icon: Settings },
];

const bottomNav = menu.slice(0, 4);

export function StoreAvatar({
  logoPath,
  name,
  className,
}: {
  logoPath: string | null;
  name: string;
  className?: string;
}) {
  const { data: url } = useSignedUrl(logoPath);
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft text-sm font-bold text-primary",
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

export function SellerShell({ children, title }: { children: ReactNode; title: string }) {
  const { store } = useSellerAccount();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/sell/login", replace: true });
  }

  const isActive = (to: string) =>
    to === "/sell/dashboard" ? pathname === to : pathname.startsWith(to);

  const nav = (
    <nav className="space-y-1">
      {menu.map(({ label, to, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={() => setMenuOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(to)
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
      <button
        type="button"
        onClick={signOut}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Logout
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-surface p-4 lg:block">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
          <StoreAvatar logoPath={store?.logo_path ?? null} name={store?.name ?? "CC"} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{store?.name ?? "Your store"}</p>
            <p className="text-xs text-muted-foreground">Seller</p>
          </div>
        </div>
        {nav}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              className="grid size-9 place-items-center rounded-lg text-foreground lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <SheetTitle className="sr-only">Seller menu</SheetTitle>
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
                <StoreAvatar logoPath={store?.logo_path ?? null} name={store?.name ?? "CC"} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{store?.name ?? "Your store"}</p>
                  <p className="text-xs text-muted-foreground">Seller</p>
                </div>
              </div>
              {nav}
            </SheetContent>
          </Sheet>
          <h1 className="flex-1 truncate text-base font-bold">{title}</h1>
          <Link
            to="/sell/dashboard/notifications"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
          </Link>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4 lg:pb-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>

        <nav
          aria-label="Seller navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
        >
          <ul className="grid grid-cols-5">
            {bottomNav.map(({ label, to, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium",
                    isActive(to) ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex min-h-14 w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted-foreground"
              >
                <MoreHorizontal className="size-5" aria-hidden="true" />
                More
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function SellerPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="card-surface flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
        <HelpCircle className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
