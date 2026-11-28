/**
 * The people behind CampusCart, as provided by the founder. Edit here only —
 * the About Us page renders from this list. No photos: none have been provided,
 * so members are shown with initials avatars.
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
}

export const TEAM: TeamMember[] = [
  {
    name: "Sadman Nahial Nafi",
    title: "Founder & Technology Lead",
    founder: true,
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
    title: "UI/UX & Quality Assurance Contributor",
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
    title: "QA & Security Testing Contributor",
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
    title: "Operations & Seller Support Contributor",
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
    title: "Operations & Seller Support Contributor",
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

/** Testing & Security Contributors acknowledgement (names link to Facebook). */
export const TESTING_CONTRIBUTORS: { name: string; facebook: string }[] = [
  {
    name: "Ajmain Hasan Mahim",
    facebook: "https://www.facebook.com/share/1JHTdULLGg/?mibextid=wwXIfr",
  },
  {
    name: "Jowyreya Hossain",
    facebook: "https://www.facebook.com/share/1MD9CE4oi3/?mibextid=wwXIfr",
  },
];
