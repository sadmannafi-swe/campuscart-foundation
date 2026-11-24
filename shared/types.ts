/** API data shapes shared by the Express server and the React client. Dates are ISO strings. */

export type StoreStatus = "pending" | "approved" | "rejected" | "suspended";
export type OrderStatus =
  "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

/** Forward-only lifecycle: delivered/cancelled are final, cancel allowed until then. */
export function canMoveOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  if (from === "delivered" || from === "cancelled") return false;
  if (to === "cancelled") return true;
  return ORDER_STATUSES.indexOf(to) > ORDER_STATUSES.indexOf(from);
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string | null;
  batch: string | null;
  avatar_path: string | null;
  role: string;
}

export interface Seller {
  id: string;
  user_id: string;
  university_slug: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  batch: string;
  avatar_path: string | null;
  status: StoreStatus;
  order_email_enabled: boolean;
  notification_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  seller_id: string;
  user_id: string;
  university_slug: string;
  name: string;
  description: string;
  category: string;
  contact_number: string;
  logo_path: string | null;
  status: StoreStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  featured_university_slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerProduct {
  id: string;
  store_id: string;
  user_id: string;
  university_slug: string;
  name: string;
  category: string;
  price: number;
  /** Optional "was" price (always greater than `price`) — marks the listing as an offer. */
  original_price?: number | null;
  condition: string;
  description: string;
  images: string[];
  in_stock: boolean;
  is_active: boolean;
  featured_university_slug: string | null;
  created_at: string;
  updated_at: string;
}

/** Public listing: product + its store's name. */
export interface PublicProduct extends SellerProduct {
  store_name: string;
  seller_id: string;
  rating: number;
  review_count: number;
}

export interface PublicStore {
  id: string;
  name: string;
  category: string;
  description: string;
  university_slug: string;
  logo_path: string | null;
  contact_number: string;
  featured_university_slug: string | null;
  approved_at: string | null;
  created_at: string;
}

/** Approved store in the public directory, with listing and rating aggregates. */
export interface PublicStoreSummary extends PublicStore {
  product_count: number;
  rating: number;
  review_count: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  store_id: string;
  seller_id: string;
  seller_user_id: string;
  university_slug: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  note: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  delivered_at?: string | null;
  order_items: OrderItem[];
}

export interface Review {
  id: string;
  order_id: string;
  product_id: string;
  buyer_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface PublicReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface SellerReview extends PublicReview {
  product_id: string;
  product_name: string;
}

export interface EarningsTransaction {
  order_id: string;
  delivered_at: string;
  customer_name: string;
  items: Array<{ product_name: string; quantity: number; line_total: number }>;
  amount: number;
}

/** Seller earnings — computed only from this seller's DELIVERED orders. */
export interface SellerEarnings {
  total_earnings: number;
  this_month: number;
  delivered_orders: number;
  /** Value of orders still in progress (pending → shipped); not counted as earnings. */
  awaiting_delivery: number;
  transactions: EarningsTransaction[];
}

export interface AppNotification {
  id: string;
  user_id: string;
  audience: "buyer" | "seller";
  kind: string;
  title: string;
  body: string;
  order_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  product_id: string;
  store_id: string;
  seller_user_id: string;
  buyer_id: string;
  university_slug: string;
  product_name: string;
  product_price: number;
  product_image: string | null;
  buyer_name: string;
  first_message_at: string | null;
  last_message_at: string | null;
  last_message_preview: string;
  created_at: string;
  /** What the conversation is about. Missing on older rows = a Marketplace product. */
  kind?: ChatKind;
  /** Id of the listing/request/profile for non-product conversations. */
  context_id?: string | null;
  /** Short second line for the context card, e.g. "B+ · Dhaka Medical College". */
  context_subtitle?: string | null;
  /** Name of the owner (seller side), shown to the person who started the chat. */
  owner_name?: string | null;
}

export type ChatKind = "product" | "preowned" | "blood_request" | "donor" | "basha";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: "buyer" | "seller";
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface AdminApplication {
  store: Store;
  seller: Seller | null;
  studentId: string | null;
  studentIdImageUrl: string | null;
  logoUrl: string | null;
  universityName: string | null;
}

export interface StoreOrderSummary {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  deliveredSales: number;
}

export interface AdminOrder {
  order: Omit<Order, "order_items">;
  items: OrderItem[];
}

export type UploadKind = "product" | "store-logo" | "avatar" | "student-id" | "preowned" | "basha";

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  type: "upload" | "authenticated";
}

// ---- Campus modules: Pre-Owned, Blood Donation, BashaLagbe ----------------

/** Admin moderation flag, separate from the owner's own status. */
export type Moderation = "visible" | "hidden";

/** Public name of the person behind a listing. Never e-mail, phone or student ID. */
export interface PublicOwner {
  id: string;
  name: string;
  member_since: string | null;
}

export const PREOWNED_CONDITIONS = ["like-new", "good", "fair", "used"] as const;
export type PreOwnedCondition = (typeof PREOWNED_CONDITIONS)[number];
export const PREOWNED_CONDITION_LABELS: Record<PreOwnedCondition, string> = {
  "like-new": "Like New",
  good: "Good",
  fair: "Fair",
  used: "Used",
};
export type PreOwnedStatus = "available" | "sold";

export interface PreOwnedListing {
  id: string;
  owner_id: string;
  university_slug: string;
  title: string;
  description: string;
  category: string;
  price: number;
  original_price: number | null;
  condition: PreOwnedCondition;
  images: string[];
  location: string;
  status: PreOwnedStatus;
  moderation: Moderation;
  owner: PublicOwner;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
}

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export type BloodRequestStatus = "active" | "fulfilled" | "cancelled";
/** "messages" keeps contact inside CampusCart; "phone" shows a number the user chose to share. */
export type ContactPreference = "messages" | "phone";

export interface BloodRequest {
  id: string;
  owner_id: string;
  university_slug: string;
  patient_name: string | null;
  blood_group: BloodGroup;
  hospital_name: string;
  hospital_location: string;
  needed_on: string;
  donors_needed: number;
  contact_preference: ContactPreference;
  /** Only present when the requester chose to share a phone number. */
  contact_phone: string | null;
  description: string;
  status: BloodRequestStatus;
  moderation: Moderation;
  owner: PublicOwner;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
}

export type DonorAvailability = "available" | "unavailable";

export interface DonorProfile {
  id: string;
  owner_id: string;
  university_slug: string;
  name: string;
  blood_group: BloodGroup;
  department: string;
  batch: string;
  location: string;
  contact_preference: ContactPreference;
  contact_phone: string | null;
  availability: DonorAvailability;
  moderation: Moderation;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
}

export const BASHA_TYPES = ["single_room", "shared_room", "apartment"] as const;
export type BashaType = (typeof BASHA_TYPES)[number];
export const BASHA_TYPE_LABELS: Record<BashaType, string> = {
  single_room: "Single Room",
  shared_room: "Roommate Needed / Shared Room",
  apartment: "Full Apartment",
};
export type BashaStatus = "available" | "rented" | "unavailable";
export const BASHA_FACILITY_KEYS = [
  "attached_bathroom",
  "balcony",
  "kitchen",
  "furnished",
  "electricity",
  "water",
  "wifi",
  "gas",
] as const;
export type BashaFacilityKey = (typeof BASHA_FACILITY_KEYS)[number];

export interface BashaFacilities {
  attached_bathroom: boolean;
  /** Only when attached_bathroom is true. */
  bathroom_type: "private" | "shared" | null;
  balcony: boolean;
  kitchen: boolean;
  /** Only when kitchen is true. */
  kitchen_type: "private" | "shared" | null;
  furnished: boolean;
  electricity: boolean;
  water: boolean;
  wifi: boolean;
  gas: boolean;
  other: string;
  rules: string;
}

/** Only for single and shared rooms. */
export interface BashaRoommate {
  available_seats: number;
  current_roommates: number;
  preferred_type: string;
  gender_preference: string;
  department_preference: string;
  requirements: string;
}

export interface BashaListing {
  id: string;
  owner_id: string;
  university_slug: string;
  title: string;
  type: BashaType;
  rent: number;
  advance: number | null;
  available_from: string;
  area: string;
  /** Hidden from others unless address_public is true. */
  address: string | null;
  address_public: boolean;
  map_url: string | null;
  images: string[];
  description: string;
  facilities: BashaFacilities;
  roommate: BashaRoommate | null;
  status: BashaStatus;
  moderation: Moderation;
  owner: PublicOwner;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
}

export const REPORT_TARGETS = ["preowned", "blood_request", "donor", "basha"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];
export const REPORT_REASONS = [
  "spam",
  "misleading",
  "inappropriate",
  "scam",
  "already_sold_or_unavailable",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  misleading: "Misleading or false information",
  inappropriate: "Inappropriate content",
  scam: "Possible scam",
  already_sold_or_unavailable: "No longer available",
  other: "Something else",
};
export type ReportStatus = "open" | "reviewed" | "dismissed";

export interface AdminReport {
  id: string;
  target_type: ReportTarget;
  target_id: string;
  target_title: string | null;
  target_moderation: Moderation | null;
  reporter_id: string;
  reporter_name: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  created_at: string;
}

/** Results for the global search, labelled by source. */
export interface ScopedSearchResult {
  scope: "marketplace" | "preowned" | "all";
  marketplace: PublicProduct[];
  preowned: PreOwnedListing[];
}

export const PREOWNED_CATEGORIES = [
  "Textbooks & Notes",
  "Electronics",
  "Stationery",
  "Campus Fashion",
  "Hostel Essentials",
  "Sports & Fitness",
  "Other",
] as const;

/** One Pre-Owned / blood / donor / BashaLagbe record in the admin moderation lists. */
export interface AdminModuleRow {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  moderation: Moderation;
  owner_id: string;
  owner_name: string;
  university_slug: string;
  open_reports: number;
  created_at: string;
}
