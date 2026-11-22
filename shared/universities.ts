/** University marketplaces. Data-driven: add a campus here, no other code change. */
export interface University {
  slug: string;
  name: string;
  short_name: string;
  is_active: boolean;
  sort_order: number;
}

export const UNIVERSITIES: University[] = [
  {
    slug: "diu",
    name: "Daffodil International University",
    short_name: "DIU",
    is_active: true,
    sort_order: 1,
  },
  {
    slug: "nsu",
    name: "North South University",
    short_name: "NSU",
    is_active: true,
    sort_order: 2,
  },
  { slug: "brac", name: "BRAC University", short_name: "BRAC", is_active: true, sort_order: 3 },
  { slug: "ewu", name: "East West University", short_name: "EWU", is_active: true, sort_order: 4 },
  { slug: "du", name: "University of Dhaka", short_name: "DU", is_active: true, sort_order: 5 },
];

export const universityBySlug = (slug: string) => UNIVERSITIES.find((u) => u.slug === slug);

export const STORE_CATEGORIES = [
  "Textbooks & Notes",
  "Electronics",
  "Stationery",
  "Campus Fashion",
  "Food & Snacks",
  "Hostel Essentials",
  "Sports & Fitness",
  "Student Services",
] as const;

export const PRODUCT_CONDITIONS = ["new", "like-new", "used"] as const;
