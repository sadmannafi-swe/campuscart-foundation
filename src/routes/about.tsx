import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { TeamSection } from "@/components/about/Team";
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
  return (
    <SiteLayout>
      <div className="container-page max-w-[90rem] py-8 sm:py-12">
        <TeamSection team={TEAM} />
      </div>
    </SiteLayout>
  );
}
