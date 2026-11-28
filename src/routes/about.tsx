import { createFileRoute } from "@tanstack/react-router";
import { Facebook } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — DIU CampusCart" },
      {
        name: "description",
        content: "The people who help keep DIU CampusCart safe and reliable.",
      },
      { property: "og:title", content: "About Us — DIU CampusCart" },
      {
        property: "og:description",
        content: "The people who help keep DIU CampusCart safe and reliable.",
      },
    ],
  }),
  component: AboutPage,
});

const contributors = [
  {
    name: "Ajmain Hasan Mahim",
    role: "QA & Security Testing Contributor",
    facebook: "https://www.facebook.com/share/1JHTdULLGg/?mibextid=wwXIfr",
  },
  {
    name: "Jowyreya Hossain",
    role: "QA & Security Testing Contributor",
    facebook: "https://www.facebook.com/share/1MD9CE4oi3/?mibextid=wwXIfr",
  },
];

/** First letters of the first and last name, e.g. "AM". */
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
};

function AboutPage() {
  return (
    <SiteLayout>
      <div className="container-page py-10 sm:py-14">
        <section aria-labelledby="contributors-h" className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bloom-ink">
            About Us
          </p>
          <h1
            id="contributors-h"
            className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl"
          >
            Testing &amp; Security Contributors
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            CampusCart is grateful to the people who help us improve the platform through continuous
            testing, bug reporting and security checks. Their valuable contributions help us deliver
            a safer, smoother and more reliable experience for everyone.
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {contributors.map((c) => (
              <li key={c.name} className="card-surface flex items-center gap-4 p-5">
                <span
                  aria-hidden="true"
                  className="grid size-14 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-semibold text-bloom"
                >
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold leading-snug">{c.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{c.role}</p>
                </div>
                <a
                  href={c.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${c.name} on Facebook (opens in a new tab)`}
                  title={`${c.name} on Facebook`}
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Facebook className="size-[18px]" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SiteLayout>
  );
}
