import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingCart, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SearchBar } from "@/components/layout/SearchBar";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categories } from "@/data/marketplace";

const primaryLinks = [
  { label: "Stores", to: "/stores" as const },
  { label: "Offers", to: "/offers" as const },
  { label: "New Arrivals", to: "/new-arrivals" as const },
];

const activeProps = { className: "text-primary" };

export function Header() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
      <div className="container-page">
        <div className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-3 lg:h-16 lg:gap-6">
          <Logo size="sm" className="lg:h-10" />

          <div className="hidden min-w-0 lg:block">
            <SearchBar />
          </div>

          <div className="flex items-center justify-end gap-1">
            <nav aria-label="Main" className="mr-2 hidden items-center gap-1 lg:flex">
              <DropdownMenu>
                <DropdownMenuTrigger className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary">
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
                        <CategoryIcon name={category.icon} className="size-4 text-primary" />
                        <span className="flex-1">{category.name}</span>
                        <span className="text-xs text-muted-foreground">{category.productCount}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {primaryLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  activeProps={activeProps}
                  className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Search"
              onClick={() => setMobileSearchOpen((open) => !open)}
            >
              <Search />
            </Button>

            <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
              <Link to="/wishlist" aria-label="Wishlist">
                <Heart />
              </Link>
            </Button>

            <Button variant="ghost" size="icon" asChild className="relative">
              <Link to="/cart" aria-label="Cart">
                <ShoppingCart />
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  3
                </span>
              </Link>
            </Button>

            <Button variant="ghost" size="icon" asChild className="hidden lg:inline-flex">
              <Link to="/account" aria-label="Account">
                <User />
              </Link>
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[86vw] max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left">Browse CampusCart</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-1" aria-label="Mobile">
                  {[{ label: "Home", to: "/" as const }, ...primaryLinks, { label: "Wishlist", to: "/wishlist" as const }, { label: "Orders", to: "/orders" as const }, { label: "Account", to: "/account" as const }].map(
                    (link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                        activeProps={{ className: "bg-primary-soft text-primary" }}
                      >
                        {link.label}
                      </Link>
                    ),
                  )}
                </nav>
                <p className="mt-6 px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Categories
                </p>
                <div className="mt-2 space-y-1">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to="/products"
                      search={{ category: category.slug, q: undefined, sort: undefined }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted"
                    >
                      <CategoryIcon name={category.icon} className="size-4 text-primary" />
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
