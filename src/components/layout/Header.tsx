import { useCart } from "@/lib/cart";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Droplet,
  Home as HomeIcon,
  Menu,
  MessageCircle,
  Search,
  ShoppingCart,
  User,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SearchBar } from "@/components/layout/SearchBar";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MatchToggle } from "@/components/theme/MatchToggle";
import { useTheme } from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categories } from "@/data/marketplace";
import { useAuth } from "@/lib/auth";
import { useUnreadChatCounts } from "@/lib/chat";
import { useNotifications } from "@/lib/notifications";

const primaryLinks = [
  { label: "Stores", to: "/stores" as const },
  { label: "Offers", to: "/offers" as const },
  { label: "New Arrivals", to: "/new-arrivals" as const },
];

/** Desktop has no bottom bar, so Pre-Owned sits with the header links there. */
const desktopLinks = [...primaryLinks, { label: "Pre-Owned", to: "/preowned" as const }];

const activeProps = { className: "text-foreground after:scale-x-100" };

export function Header() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { count: cartCount } = useCart();
  const { data: unreadCounts } = useUnreadChatCounts(user?.id);
  const unreadTotal = unreadCounts ? Object.values(unreadCounts).reduce((sum, n) => sum + n, 0) : 0;
  const { data: buyerNotes = [] } = useNotifications(user?.id, "buyer");
  const unreadNotes = buyerNotes.filter((n) => !n.read_at).length;
  const navigate = useNavigate();

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/75"
    >
      <div className="container-page">
        <div className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-3 lg:h-16 lg:gap-6">
          <Logo size="sm" className="lg:h-10" />

          <div className="hidden min-w-0 lg:block">
            <SearchBar />
          </div>

          <div className="flex items-center justify-end gap-1">
            <nav aria-label="Main" className="mr-2 hidden items-center gap-1 lg:flex">
              <DropdownMenu>
                <DropdownMenuTrigger className="cursor-pointer rounded-[10px] px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=open]:text-foreground">
                  Categories
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {categories.map((category) => (
                    <DropdownMenuItem key={category.id} asChild>
                      <Link
                        to="/products"
                        search={{ category: category.slug, q: undefined, sort: undefined }}
                        className="flex items-center gap-2"
                      >
                        <CategoryIcon
                          name={category.icon}
                          className="size-4 text-muted-foreground"
                        />
                        <span className="flex-1">{category.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {category.productCount}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {desktopLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  activeProps={activeProps}
                  className="relative rounded-[10px] px-3 py-2 text-sm font-medium text-muted-foreground transition-colors after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[3px] after:origin-left after:scale-x-0 after:rounded-full after:bg-bloom after:transition-transform after:duration-300 after:ease-[var(--ease-bloom)] hover:text-foreground hover:after:scale-x-100"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <span className="mr-1.5 hidden items-center sm:inline-flex">
              <MatchToggle size={9} />
            </span>

            <Button variant="ghost" size="icon" asChild className="relative">
              <Link to="/chat" aria-label="Messages">
                <MessageCircle />
                {unreadTotal > 0 && (
                  <span className="absolute right-1 top-1 grid min-w-[18px] h-[18px] px-1 place-items-center rounded-full bg-bloom text-[11px] font-semibold text-bloom-foreground">
                    {unreadTotal > 9 ? "9+" : unreadTotal}
                  </span>
                )}
              </Link>
            </Button>

            {user && (
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/notifications" aria-label="Notifications">
                  <Bell />
                  {unreadNotes > 0 && (
                    <span className="absolute right-1 top-1 grid min-w-[18px] h-[18px] px-1 place-items-center rounded-full bg-bloom text-[11px] font-semibold text-bloom-foreground">
                      {unreadNotes > 9 ? "9+" : unreadNotes}
                    </span>
                  )}
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Search"
              onClick={() => setMobileSearchOpen((open) => !open)}
            >
              <Search />
            </Button>

            <Button variant="ghost" size="icon" asChild className="relative">
              <Link to="/cart" aria-label="Cart" data-cart-target="">
                <ShoppingCart />
                {cartCount > 0 && (
                  <span className="absolute right-1 top-1 grid min-w-[18px] h-[18px] px-1 place-items-center rounded-full bg-bloom text-[11px] font-semibold text-bloom-foreground">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:inline-flex"
                  aria-label="Profile"
                >
                  <User />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/sell">Sell on CampusCart</Link>
                </DropdownMenuItem>
                {user ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/account">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders">Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={async () => {
                        await signOut();
                        void navigate({ to: "/diu", replace: true });
                      }}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/account">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/auth" search={{ mode: "login" }}>
                        Log in
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/auth" search={{ mode: "signup" }}>
                        Create account
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[86vw] max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left">Browse CampusCart</SheetTitle>
                </SheetHeader>
                <ThemeRow />
                <nav className="mt-4 space-y-1" aria-label="Mobile">
                  {[
                    { label: "Home", to: "/diu" as const },
                    ...primaryLinks,
                    { label: "Orders", to: "/orders" as const },
                    { label: "Profile", to: "/account" as const },
                  ].map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                      activeProps={{ className: "bg-bloom-soft text-foreground" }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <p className="mt-6 px-3 text-xs font-semibold text-muted-foreground">
                  Campus services
                </p>
                <div className="mt-2 space-y-1">
                  <Link
                    to="/blood"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-blood-soft"
                    activeProps={{ className: "bg-blood-soft" }}
                  >
                    <span className="grid size-8 place-items-center rounded-[10px] bg-blood-soft text-blood">
                      <Droplet className="size-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1">
                      Blood Donation
                      <span className="block text-xs font-normal text-muted-foreground">
                        Requests and donors
                      </span>
                    </span>
                  </Link>
                  <Link
                    to="/basha"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-basha-soft"
                    activeProps={{ className: "bg-basha-soft" }}
                  >
                    <span className="grid size-8 place-items-center rounded-[10px] bg-basha-soft text-basha">
                      <HomeIcon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1">
                      BashaLagbe
                      <span className="block text-xs font-normal text-muted-foreground">
                        Rooms, roommates, apartments
                      </span>
                    </span>
                  </Link>
                </div>
                <div className="mt-2 px-3">
                  <Link
                    to="/sell"
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground underline decoration-bloom decoration-2 underline-offset-4 transition-colors hover:bg-muted"
                  >
                    Sell on CampusCart
                  </Link>
                </div>
                {!user && (
                  <div className="mt-4 grid gap-2 px-3">
                    <Button asChild size="sm">
                      <Link to="/auth" search={{ mode: "login" }}>
                        Log in
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/auth" search={{ mode: "signup" }}>
                        Create account
                      </Link>
                    </Button>
                  </div>
                )}
                <p className="mt-6 px-3 text-xs font-semibold text-muted-foreground">Categories</p>
                <div className="mt-2 space-y-1">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to="/products"
                      search={{ category: category.slug, q: undefined, sort: undefined }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted"
                    >
                      <CategoryIcon name={category.icon} className="size-4 text-muted-foreground" />
                      {category.name}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="pb-2.5 lg:hidden">
          <SearchBar
            placeholder="Search products, stores..."
            autoFocus={mobileSearchOpen}
            onSubmitted={() => setMobileSearchOpen(false)}
          />
        </div>
      </div>
    </header>
  );
}

/** Phone menu: the light/dark match switch, larger and labelled. */
function ThemeRow() {
  const theme = useTheme();
  return (
    <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Appearance</p>
        <p className="text-xs text-muted-foreground">
          {theme === "light"
            ? "Light — blow out the match for dark"
            : "Dark — strike the match for light"}
        </p>
      </div>
      <MatchToggle size={12} />
    </div>
  );
}
