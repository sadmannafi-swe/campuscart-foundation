import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { Wordmark } from "@/components/brand/BloomMark";
import { BloomMark } from "@/components/brand/BloomMark";

const columns = [
  {
    title: "Marketplace",
    links: [
      { label: "All products", to: "/products" as const },
      { label: "Stores", to: "/stores" as const },
      { label: "Categories", to: "/categories" as const },
      { label: "Offers", to: "/offers" as const },
      { label: "New arrivals", to: "/new-arrivals" as const },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Profile", to: "/account" as const },
      { label: "Orders", to: "/orders" as const },
      { label: "Wishlist", to: "/wishlist" as const },
      { label: "Cart", to: "/cart" as const },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden bg-ink text-ink-foreground">
      <div className="container-page grid gap-8 py-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Wordmark campus="DIU" className="[&_span]:!text-ink-foreground" />
          <p className="max-w-xs text-sm text-ink-foreground/65">
            The official student marketplace of Daffodil International University. Buy, sell and
            discover everything campus life needs.
          </p>
          <div className="flex gap-2">
            {[Facebook, Instagram, Linkedin].map((Icon, i) => (
              <span
                key={i}
                className="grid size-9 place-items-center rounded-full bg-ink-foreground/10 text-ink-foreground/80"
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold">{column.title}</h3>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-ink-foreground/65 transition-colors hover:text-bloom"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="text-sm font-semibold">Campus support</h3>
          <ul className="mt-3 space-y-2.5 text-sm text-ink-foreground/65">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-bloom" aria-hidden="true" />
              Daffodil Smart City, Ashulia, Dhaka
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-bloom" aria-hidden="true" />
              support@diucampuscart.com
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-bloom" aria-hidden="true" />
              +880 1700 000 000
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-foreground/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-foreground/55 sm:flex-row">
          <p>© {new Date().getFullYear()} DIU CampusCart. Your Campus. Your Marketplace.</p>
          <p>Built for Daffodil International University students.</p>
        </div>
      </div>
      <BloomMark className="pointer-events-none absolute -bottom-24 -right-16 size-72 opacity-[0.07]" />
    </footer>
  );
}
