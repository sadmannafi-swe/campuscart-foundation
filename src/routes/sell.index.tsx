import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Store, UserPlus } from "lucide-react";
import mainLogo from "@/assets/campuscart-main-logo.png.asset.json";

export const Route = createFileRoute("/sell/")({
  head: () => ({
    meta: [
      { title: "Sell on CampusCart — Seller Account" },
      {
        name: "description",
        content:
          "Create your CampusCart seller account, open a store in your university marketplace and start selling to students.",
      },
      { property: "og:title", content: "Sell on CampusCart — Seller Account" },
      {
        property: "og:description",
        content: "Open a verified student store inside your university marketplace on CampusCart.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SellerEntry,
});

const benefits = [
  { title: "Verified Students", body: "Only students can buy & sell on CampusCart" },
  { title: "Safe & Secure", body: "Your data and store are always protected" },
  { title: "No Extra Charges", body: "List your products for free" },
  { title: "Grow Your Store", body: "Reach thousands of students" },
  { title: "Track & Manage", body: "Manage orders, sales and customers easily" },
];

export default function SellerEntry() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
        <div className="flex flex-col items-center text-center">
          <img
            src={mainLogo.url}
            alt="CampusCart"
            className="h-16 w-auto object-contain"
            width={512}
            height={512}
          />
          <h1 className="mt-5 text-xl font-extrabold sm:text-2xl">Welcome to CampusCart</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start your journey as a seller</p>
        </div>

        <div className="mt-6 grid place-items-center rounded-3xl bg-primary-soft/60 px-6 py-10">
          <Store className="size-20 text-primary" aria-hidden="true" />
        </div>

        <div className="mt-6 space-y-3">
          <Link
            to="/sell/register"
            className="card-surface flex items-center gap-3 p-4 transition-shadow hover:shadow-card-hover"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <UserPlus className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Create Seller Account</span>
              <span className="block text-xs text-muted-foreground">
                Create your seller account and open your store
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>

          <Link
            to="/sell/login"
            className="card-surface flex items-center gap-3 p-4 transition-shadow hover:shadow-card-hover"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Store className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Seller Login</span>
              <span className="block text-xs text-muted-foreground">
                Login to your existing seller account
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-6 rounded-2xl bg-muted/70 p-4 text-center">
          <p className="text-xs text-muted-foreground">Already a buyer?</p>
          <Link to="/auth" search={{ mode: "login" }} className="text-sm font-semibold text-primary">
            Login with your buyer account
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="text-center text-base font-bold text-primary">Why Sell on CampusCart?</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {benefits.map((b) => (
              <li key={b.title} className="card-surface p-3 text-center">
                <p className="text-sm font-semibold">{b.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{b.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            ← Back to CampusCart
          </Link>
        </p>
      </div>
    </div>
  );
}
