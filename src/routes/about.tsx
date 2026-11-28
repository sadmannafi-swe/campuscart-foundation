import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { TeamCard } from "@/components/about/Team";
import { TEAM } from "@/data/team";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — DIU CampusCart" },
      {
        name: "description",
        content: "Meet the team behind DIU CampusCart.",
      },
      { property: "og:title", content: "About Us — DIU CampusCart" },
      {
        property: "og:description",
        content: "Meet the team behind DIU CampusCart.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const [founder, ...members] = TEAM;
  return (
    <SiteLayout>
      <div className="container-page py-10 sm:py-14">
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
      </div>
    </SiteLayout>
  );
}
