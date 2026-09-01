import diuLogo from "@/assets/uni-diu.png.asset.json";
import nsuLogo from "@/assets/uni-nsu.png.asset.json";
import bracLogo from "@/assets/uni-brac.png.asset.json";
import duLogo from "@/assets/uni-du.jpg.asset.json";
import ewuLogo from "@/assets/uni-ewu.jpg.asset.json";
import mainLogo from "@/assets/campuscart-main-logo.png.asset.json";

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
    logo: mainLogo.url,
  },
  {
    slug: "diu",
    name: "DIU CampusCart",
    shortName: "DIU",
    tagline: "Daffodil International University",
    status: "live",
    path: "/diu",
    logo: diuLogo.url,
  },
  {
    slug: "nsu",
    name: "NSU CampusCart",
    shortName: "NSU",
    tagline: "North South University",
    status: "coming-soon",
    logo: nsuLogo.url,
  },
  {
    slug: "brac",
    name: "BRAC CampusCart",
    shortName: "BRAC",
    tagline: "BRAC University",
    status: "coming-soon",
    logo: bracLogo.url,
  },
  {
    slug: "du",
    name: "DU CampusCart",
    shortName: "DU",
    tagline: "University of Dhaka",
    status: "coming-soon",
    logo: duLogo.url,
  },
  {
    slug: "ewu",
    name: "EWU CampusCart",
    shortName: "EWU",
    tagline: "East West University",
    status: "coming-soon",
    logo: ewuLogo.url,
  },
];

export function getCampus(slug: string) {
  return campuses.find((campus) => campus.slug === slug);
}
