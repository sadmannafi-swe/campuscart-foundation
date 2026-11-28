import { createFileRoute } from "@tanstack/react-router";
import { Facebook } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { TeamCard } from "@/components/about/Team";
import { TEAM, TESTING_CONTRIBUTORS } from "@/data/team";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — DIU CampusCart" },
      {
        name: "description",
        content:
          "Meet the team behind DIU CampusCart, and the people who help keep it safe and reliable.",
      },
      { property: "og:title", content: "About Us — DIU CampusCart" },
      {
        property: "og:description",
        content:
          "Meet the team behind DIU CampusCart, and the people who help keep it safe and reliable.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const [founder, ...members] = TEAM;
  return (
    <SiteLayout>
      <div className="container-page space-y-14 py-10 sm:space-y-16 sm:py-14">
        {/* ---- Our Team ---- */}
        <section aria-labelledby="team-h" className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bloom-ink">
              About Us
            </p>
            <h1
              id="team-h"
              className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl"
            >
              Meet the Team Behind CampusCart
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              CampusCart is built by a dedicated team working together to make campus shopping
              simpler, safer, and more convenient. From product development and design to quality
              assurance, security, and operations, every member contributes to building a better
              marketplace for students.
            </p>
          </div>

          <div className="mt-8 space-y-4 sm:space-y-5">
            {founder && <TeamCard member={founder} />}
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
              {members.map((m) => (
                <li key={m.name}>
                  <TeamCard member={m} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- Testing & Security Contributors (compact acknowledgement) ---- */}
        <section
          aria-labelledby="contributors-h"
          className="mx-auto max-w-6xl border-t border-border pt-10 sm:pt-12"
        >
          <div className="max-w-3xl">
            <h2
              id="contributors-h"
              className="font-display text-lg font-semibold tracking-[-0.015em] sm:text-xl"
            >
              Testing &amp; Security Contributors
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              CampusCart is grateful to the people who help us improve the platform through
              continuous testing, bug reporting, and security checks. Their valuable contributions
              help us deliver a safer, smoother, and more reliable experience for everyone.
            </p>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {TESTING_CONTRIBUTORS.map((c) => (
              <li key={c.name}>
                <a
                  href={c.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${c.name} on Facebook (opens in a new tab)`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium transition-colors duration-200 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Facebook className="size-4 text-primary" aria-hidden="true" />
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SiteLayout>
  );
}
