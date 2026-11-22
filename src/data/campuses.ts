import { brandAssets } from "@/lib/brand";
export interface Campus {
  /** URL slug used by /campus/$campusSlug (DIU has its own live route). */
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  /** Live marketplaces link straight to their own route. */
  status: "live" | "coming-soon";
  /** Path for live campuses; undefined means it uses the placeholder route. */
  path?: "/diu";
  /** Logo image URL shown on the campus card. */
  logo: string;
}

export const campuses: Campus[] = [
  {
    slug: "all-in-one",
    name: "All in One Marketplace",
    shortName: "ALL",
    tagline: "Every campus, one marketplace",
    status: "coming-soon",
    logo: brandAssets.mainLogo,
  },
  {
    slug: "diu",
    name: "DIU CampusCart",
    shortName: "DIU",
    tagline: "Daffodil International University",
    status: "live",
    path: "/diu",
    logo: brandAssets.diu,
  },
  {
    slug: "nsu",
    name: "NSU CampusCart",
    shortName: "NSU",
    tagline: "North South University",
    status: "coming-soon",
    logo: brandAssets.nsu,
  },
  {
    slug: "brac",
    name: "BRAC CampusCart",
    shortName: "BRAC",
    tagline: "BRAC University",
    status: "coming-soon",
    logo: brandAssets.brac,
  },
  {
    slug: "du",
    name: "DU CampusCart",
    shortName: "DU",
    tagline: "University of Dhaka",
    status: "coming-soon",
    logo: brandAssets.du,
  },
  {
    slug: "ewu",
    name: "EWU CampusCart",
    shortName: "EWU",
    tagline: "East West University",
    status: "coming-soon",
    logo: brandAssets.ewu,
  },
];

export function getCampus(slug: string) {
  return campuses.find((campus) => campus.slug === slug);
}
