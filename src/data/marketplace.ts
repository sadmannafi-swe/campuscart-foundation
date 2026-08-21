import type { Category, Product, Review, Store } from "@/lib/types";

/**
 * Phase 1 sample catalogue used for visual development only.
 * Every accessor below is async-friendly by shape, so these functions can be
 * swapped for Supabase queries later without touching UI components.
 */

const tints: Array<{ from: string; to: string }> = [
  { from: "from-primary/15", to: "to-accent/10" },
  { from: "from-accent/15", to: "to-primary/10" },
  { from: "from-primary/10", to: "to-primary/25" },
  { from: "from-accent/10", to: "to-accent/25" },
  { from: "from-muted", to: "to-primary/15" },
  { from: "from-muted", to: "to-accent/15" },
];

const tint = (i: number) => tints[i % tints.length]!;

export const categories: Category[] = [
  { id: "c1", slug: "textbooks", name: "Textbooks & Notes", icon: "BookOpen", productCount: 412 },
  { id: "c2", slug: "electronics", name: "Electronics", icon: "Laptop", productCount: 286 },
  { id: "c3", slug: "stationery", name: "Stationery", icon: "PenTool", productCount: 173 },
  { id: "c4", slug: "fashion", name: "Campus Fashion", icon: "Shirt", productCount: 208 },
  { id: "c5", slug: "food", name: "Food & Snacks", icon: "Coffee", productCount: 94 },
  { id: "c6", slug: "hostel", name: "Hostel Essentials", icon: "Bed", productCount: 137 },
  { id: "c7", slug: "sports", name: "Sports & Fitness", icon: "Dumbbell", productCount: 88 },
  { id: "c8", slug: "services", name: "Student Services", icon: "Sparkles", productCount: 65 },
];

export const stores: Store[] = [
  {
    id: "s1",
    slug: "daffodil-book-hub",
    name: "Daffodil Book Hub",
    categorySlug: "textbooks",
    categoryName: "Textbooks & Notes",
    description:
      "The largest student-run bookstore on campus. Semester bundles, solved notes and lab manuals for every CSE, EEE and BBA course.",
    rating: 4.9,
    reviewCount: 1240,
    productCount: 184,
    status: "open",
    location: "Knowledge Tower, Level 3",
    responseTime: "Replies in ~10 min",
    joinedAt: "Jan 2024",
    verified: true,
    featured: true,
    accentFrom: "from-primary/20",
    accentTo: "to-accent/10",
    initials: "DB",
  },
  {
    id: "s2",
    slug: "campus-tech-lab",
    name: "Campus Tech Lab",
    categorySlug: "electronics",
    categoryName: "Electronics",
    description:
      "Refurbished laptops, accessories and lab kits verified by senior engineering students. 7-day replacement on every device.",
    rating: 4.7,
    reviewCount: 862,
    productCount: 132,
    status: "open",
    location: "AB-4, Ground Floor",
    responseTime: "Replies in ~25 min",
    joinedAt: "Mar 2024",
    verified: true,
    featured: true,
    accentFrom: "from-accent/20",
    accentTo: "to-primary/10",
    initials: "CT",
  },
  {
    id: "s3",
    slug: "the-print-corner",
    name: "The Print Corner",
    categorySlug: "stationery",
    categoryName: "Stationery",
    description:
      "Printing, binding, thesis covers and premium stationery delivered to your classroom within the hour.",
    rating: 4.6,
    reviewCount: 517,
    productCount: 76,
    status: "busy",
    location: "Student Plaza",
    responseTime: "Replies in ~40 min",
    joinedAt: "Sep 2023",
    verified: true,
    featured: true,
    accentFrom: "from-primary/15",
    accentTo: "to-primary/25",
    initials: "PC",
  },
  {
    id: "s4",
    slug: "hostel-mart",
    name: "Hostel Mart",
    categorySlug: "hostel",
    categoryName: "Hostel Essentials",
    description:
      "Everything for hall life — bedding, kettles, storage and cleaning kits at student-friendly prices.",
    rating: 4.5,
    reviewCount: 388,
    productCount: 98,
    status: "open",
    location: "Ashulia Hall Gate",
    responseTime: "Replies in ~1 hr",
    joinedAt: "Feb 2024",
    verified: false,
    featured: false,
    accentFrom: "from-accent/15",
    accentTo: "to-accent/25",
    initials: "HM",
  },
  {
    id: "s5",
    slug: "green-bites",
    name: "Green Bites",
    categorySlug: "food",
    categoryName: "Food & Snacks",
    description:
      "Fresh homemade meal boxes, coffee and healthy snacks prepared by the campus culinary club.",
    rating: 4.8,
    reviewCount: 954,
    productCount: 41,
    status: "open",
    location: "Cafeteria Annex",
    responseTime: "Replies instantly",
    joinedAt: "Nov 2023",
    verified: true,
    featured: true,
    accentFrom: "from-accent/20",
    accentTo: "to-accent/10",
    initials: "GB",
  },
  {
    id: "s6",
    slug: "diu-threads",
    name: "DIU Threads",
    categorySlug: "fashion",
    categoryName: "Campus Fashion",
    description:
      "Official-style club hoodies, batch tees and custom department merch printed on demand.",
    rating: 4.4,
    reviewCount: 276,
    productCount: 63,
    status: "closed",
    location: "Design Block, Room 210",
    responseTime: "Replies in ~3 hrs",
    joinedAt: "Jun 2024",
    verified: false,
    featured: false,
    accentFrom: "from-primary/20",
    accentTo: "to-muted",
    initials: "DT",
  },
  {
    id: "s7",
    slug: "fitzone-campus",
    name: "FitZone Campus",
    categorySlug: "sports",
    categoryName: "Sports & Fitness",
    description:
      "Gym gear, jerseys and tournament kits supplied by the DIU sports society.",
    rating: 4.3,
    reviewCount: 191,
    productCount: 47,
    status: "open",
    location: "Sports Complex",
    responseTime: "Replies in ~2 hrs",
    joinedAt: "Apr 2024",
    verified: false,
    featured: false,
    accentFrom: "from-muted",
    accentTo: "to-primary/15",
    initials: "FZ",
  },
  {
    id: "s8",
    slug: "skillbridge-studio",
    name: "SkillBridge Studio",
    categorySlug: "services",
    categoryName: "Student Services",
    description:
      "CV design, presentation decks, tutoring hours and portfolio reviews by senior students.",
    rating: 4.9,
    reviewCount: 143,
    productCount: 22,
    status: "open",
    location: "Innovation Lab",
    responseTime: "Replies in ~30 min",
    joinedAt: "Aug 2024",
    verified: true,
    featured: false,
    accentFrom: "from-muted",
    accentTo: "to-accent/15",
    initials: "SB",
  },
];

interface Seed {
  name: string;
  categorySlug: string;
  storeId: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  condition: Product["condition"];
  tags: Product["tags"];
  inStock?: boolean;
  variants?: Product["variants"];
}

const seeds: Seed[] = [
  { name: "CSE Semester Bundle — 6 Textbooks", categorySlug: "textbooks", storeId: "s1", price: 3450, originalPrice: 4800, rating: 4.9, reviewCount: 212, condition: "like-new", tags: ["featured", "offer"] },
  { name: "Data Structures Solved Note Pack", categorySlug: "textbooks", storeId: "s1", price: 420, originalPrice: 600, rating: 4.8, reviewCount: 178, condition: "new", tags: ["trending", "offer"] },
  { name: "Engineering Drawing Kit", categorySlug: "stationery", storeId: "s3", price: 890, rating: 4.5, reviewCount: 96, condition: "new", tags: ["new"] },
  { name: "Refurbished ThinkPad T480 — 16GB", categorySlug: "electronics", storeId: "s2", price: 32500, originalPrice: 38000, rating: 4.7, reviewCount: 64, condition: "used", tags: ["featured", "offer"], variants: [{ id: "v1", label: "Storage", options: ["256GB SSD", "512GB SSD", "1TB SSD"] }] },
  { name: "Noise-Cancelling Study Headphones", categorySlug: "electronics", storeId: "s2", price: 4200, originalPrice: 5600, rating: 4.6, reviewCount: 231, condition: "new", tags: ["trending", "offer"], variants: [{ id: "v2", label: "Color", options: ["Midnight Blue", "Graphite", "Mint"] }] },
  { name: "Arduino Starter Lab Kit", categorySlug: "electronics", storeId: "s2", price: 2750, rating: 4.4, reviewCount: 58, condition: "new", tags: ["new"] },
  { name: "Thesis Hardcover Binding Service", categorySlug: "services", storeId: "s3", price: 350, rating: 4.7, reviewCount: 402, condition: "new", tags: ["trending"] },
  { name: "A4 Premium Notebook (Pack of 5)", categorySlug: "stationery", storeId: "s3", price: 540, originalPrice: 700, rating: 4.3, reviewCount: 121, condition: "new", tags: ["offer"] },
  { name: "DIU Batch Hoodie 2026", categorySlug: "fashion", storeId: "s6", price: 1650, originalPrice: 1990, rating: 4.6, reviewCount: 187, condition: "new", tags: ["featured", "new"], variants: [{ id: "v3", label: "Size", options: ["S", "M", "L", "XL"] }, { id: "v4", label: "Color", options: ["Navy", "Green", "Grey"] }] },
  { name: "Department Tee — CSE", categorySlug: "fashion", storeId: "s6", price: 690, rating: 4.2, reviewCount: 74, condition: "new", tags: ["new"], variants: [{ id: "v5", label: "Size", options: ["S", "M", "L", "XL"] }] },
  { name: "Homemade Lunch Box (Weekly Plan)", categorySlug: "food", storeId: "s5", price: 1400, originalPrice: 1750, rating: 4.9, reviewCount: 512, condition: "new", tags: ["featured", "trending", "offer"] },
  { name: "Cold Brew Coffee Bottle 500ml", categorySlug: "food", storeId: "s5", price: 180, rating: 4.7, reviewCount: 289, condition: "new", tags: ["trending"] },
  { name: "Hostel Bedding Set — Single", categorySlug: "hostel", storeId: "s4", price: 2250, originalPrice: 2800, rating: 4.4, reviewCount: 133, condition: "new", tags: ["offer"] },
  { name: "Compact Electric Kettle 1.2L", categorySlug: "hostel", storeId: "s4", price: 1180, rating: 4.3, reviewCount: 91, condition: "new", tags: ["new"] },
  { name: "Study Desk Lamp with USB", categorySlug: "hostel", storeId: "s4", price: 950, originalPrice: 1200, rating: 4.5, reviewCount: 164, condition: "new", tags: ["trending", "offer"] },
  { name: "Badminton Racket Pro Series", categorySlug: "sports", storeId: "s7", price: 2100, rating: 4.2, reviewCount: 48, condition: "new", tags: ["new"] },
  { name: "Campus Football Jersey", categorySlug: "sports", storeId: "s7", price: 1250, originalPrice: 1500, rating: 4.1, reviewCount: 37, condition: "new", tags: ["offer"], inStock: false, variants: [{ id: "v6", label: "Size", options: ["M", "L", "XL"] }] },
  { name: "CV & Portfolio Review (1 hr)", categorySlug: "services", storeId: "s8", price: 800, rating: 5, reviewCount: 66, condition: "new", tags: ["featured", "trending"] },
  { name: "Presentation Deck Design", categorySlug: "services", storeId: "s8", price: 1500, originalPrice: 2000, rating: 4.8, reviewCount: 39, condition: "new", tags: ["offer"] },
  { name: "Scientific Calculator FX-991", categorySlug: "electronics", storeId: "s2", price: 1650, rating: 4.8, reviewCount: 305, condition: "new", tags: ["trending"] },
  { name: "Physics Lab Manual — Latest Edition", categorySlug: "textbooks", storeId: "s1", price: 380, rating: 4.4, reviewCount: 88, condition: "new", tags: ["new"] },
  { name: "Highlighter & Sticky Note Bundle", categorySlug: "stationery", storeId: "s3", price: 320, originalPrice: 420, rating: 4.5, reviewCount: 142, condition: "new", tags: ["offer", "new"] },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const products: Product[] = seeds.map((seed, index) => {
  const store = stores.find((s) => s.id === seed.storeId)!;
  return {
    id: `p${index + 1}`,
    slug: slugify(seed.name),
    name: seed.name,
    categorySlug: seed.categorySlug,
    storeId: seed.storeId,
    price: seed.price,
    originalPrice: seed.originalPrice,
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    inStock: seed.inStock ?? true,
    condition: seed.condition,
    description: `${seed.name} listed by ${store.name}. Curated for DIU students with campus pickup or same-day delivery to your hall. Every listing is reviewed by the CampusCart moderation team before it goes live.`,
    highlights: [
      "Verified campus seller",
      "Same-day pickup available",
      "Student-only pricing",
      "7-day return window",
    ],
    variants: seed.variants,
    tags: seed.tags,
    accentFrom: tint(index).from,
    accentTo: tint(index).to,
  };
});

/* ---------- accessors (swap these for Supabase queries later) ---------- */

export const getStoreById = (id: string) => stores.find((s) => s.id === id);
export const getStoreBySlug = (slug: string) => stores.find((s) => s.slug === slug);
export const getProductBySlug = (slug: string) => products.find((p) => p.slug === slug);
export const getCategoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
export const getProductsByStore = (storeId: string) =>
  products.filter((p) => p.storeId === storeId);
export const getProductsByTag = (tag: Product["tags"][number]) =>
  products.filter((p) => p.tags.includes(tag));
export const getFeaturedStores = () => stores.filter((s) => s.featured);
export const getTopRatedStores = () => [...stores].sort((a, b) => b.rating - a.rating).slice(0, 4);
export const getRelatedProducts = (product: Product) =>
  products.filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id).slice(0, 4);

/* ---------- reviews (public-safe fields only) ---------- */

const reviewerNames = [
  "Nusrat J.", "Tanvir H.", "Sadia R.", "Rakib A.", "Mehedi K.",
  "Farhana S.", "Imran C.", "Sabbir M.", "Anika T.", "Rifat B.",
];

const reviewBodies = [
  "Exactly as described and the seller met me right at the campus gate. Would buy again.",
  "Great value for students. Packaging was neat and delivery to the hall was quick.",
  "Good quality overall. Minor wear but nothing that affects use — fair for the price.",
  "Seller replied within minutes and was flexible with the pickup time. Smooth experience.",
  "Solid purchase. Been using it daily for a few weeks now with no issues.",
  "Decent, though it took a day longer than expected. Still happy with the item.",
];

const hash = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
};

export const getReviewsForProduct = (product: Product): Review[] => {
  const base = hash(product.id);
  const count = 3 + (base % 3);
  return Array.from({ length: count }, (_, i) => {
    const seed = hash(`${product.id}-${i}`);
    const rating = Math.max(3, Math.min(5, Math.round(product.rating) - (seed % 3 === 0 ? 1 : 0)));
    const date = new Date(Date.UTC(2026, 7, 18 - ((seed % 60) + i * 3)));
    return {
      id: `${product.id}-r${i + 1}`,
      productId: product.id,
      author: reviewerNames[(base + i * 3) % reviewerNames.length]!,
      rating,
      title: "",
      body: reviewBodies[(seed + i) % reviewBodies.length]!,
      date: date.toISOString().slice(0, 10),
      verifiedPurchase: seed % 4 !== 0,
    };
  });
};
