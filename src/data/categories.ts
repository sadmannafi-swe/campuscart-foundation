import type { Category } from "@/lib/types";

/**
 * Marketplace categories (configuration, used in production).
 * `productCount` is a placeholder — live counts come from useCategoryCounts().
 */
export const categories: Category[] = [
  { id: "c1", slug: "textbooks", name: "Textbooks & Notes", icon: "BookOpen", productCount: 0 },
  { id: "c2", slug: "electronics", name: "Electronics", icon: "Laptop", productCount: 0 },
  { id: "c3", slug: "stationery", name: "Stationery", icon: "PenTool", productCount: 0 },
  { id: "c4", slug: "fashion", name: "Campus Fashion", icon: "Shirt", productCount: 0 },
  { id: "c5", slug: "food", name: "Food & Snacks", icon: "Coffee", productCount: 0 },
  { id: "c6", slug: "hostel", name: "Hostel Essentials", icon: "Bed", productCount: 0 },
  { id: "c7", slug: "sports", name: "Sports & Fitness", icon: "Dumbbell", productCount: 0 },
  { id: "c8", slug: "services", name: "Student Services", icon: "Sparkles", productCount: 0 },
];
