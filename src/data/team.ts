/**
 * The people behind CampusCart, as provided by the founder. Edit here only —
 * the About Us page renders from this list.
 *
 * Photos live in /public/team/ (square, 512 px, face centred for the round frame).
 * Without `photo` a profile shows an empty image placeholder.
 */

export type SocialKind = "website" | "facebook" | "linkedin";

export interface SocialLink {
  kind: SocialKind;
  url: string;
}

export interface TeamMember {
  name: string;
  title: string;
  responsibilities: string[];
  links: SocialLink[];
  /** Shown first and highlighted. */
  founder?: boolean;
  /** Card colour (profile ring, role badge, profile button). */
  accent: TeamAccent;
  /** Profile photo path under /public (optional; a placeholder shows until set). */
  photo?: string;
}

export type TeamAccent = "blue" | "green" | "purple" | "orange";

export const TEAM: TeamMember[] = [
  {
    name: "Sadman Nahial Nafi",
    photo: "/team/sadman.webp",
    title: "Founder & Technology Lead",
    founder: true,
    accent: "blue",
    responsibilities: [
      "Founder & Product Manager",
      "Frontend Development",
      "Backend Development",
      "Security & Technical Oversight",
      "DevOps & Deployment",
    ],
    links: [
      { kind: "website", url: "https://sadmannafi.com" },
      { kind: "facebook", url: "https://www.facebook.com/share/19wKwtXb7X/?mibextid=wwXIfr" },
      { kind: "linkedin", url: "https://www.linkedin.com/in/sadman-nahial-nafi/" },
    ],
  },
  {
    name: "Jowyreya Hossain",
    photo: "/team/jowyreya.webp",
    title: "UI/UX & Quality Assurance Contributor",
    accent: "blue",
    responsibilities: [
      "UI/UX Design",
      "Interface & Usability Testing",
      "Manual Quality Assurance",
      "Feature Testing",
    ],
    links: [
      { kind: "facebook", url: "https://www.facebook.com/share/1MD9CE4oi3/?mibextid=wwXIfr" },
    ],
  },
  {
    name: "Ajmain Hasan Mahim",
    photo: "/team/ajmain.webp",
    title: "QA & Security Testing Contributor",
    accent: "green",
    responsibilities: [
      "Manual Quality Assurance",
      "Bug Identification & Reporting",
      "Security Testing",
      "Regression Testing",
    ],
    links: [
      { kind: "facebook", url: "https://www.facebook.com/share/1JHTdULLGg/?mibextid=wwXIfr" },
    ],
  },
  {
    name: "Farhan Adib",
    photo: "/team/farhan.webp",
    title: "Operations & Seller Support Contributor",
    accent: "purple",
    responsibilities: [
      "Seller Support",
      "Seller Onboarding",
      "Marketplace Operations",
      "User & Seller Assistance",
    ],
    links: [
      { kind: "facebook", url: "https://www.facebook.com/share/1E6Ekag9qQ/?mibextid=wwXIfr" },
    ],
  },
  {
    name: "Fatin Istiak Shammo",
    photo: "/team/fatin.webp",
    title: "Operations & Seller Support Contributor",
    accent: "orange",
    responsibilities: [
      "Seller Support",
      "Marketplace Operations",
      "Seller Communication",
      "Operational Assistance",
    ],
    links: [
      { kind: "facebook", url: "https://www.facebook.com/share/1KrxJganDW/?mibextid=wwXIfr" },
    ],
  },
];
