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
}

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

export type UploadKind = "product" | "store-logo" | "avatar" | "student-id";

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  type: "upload" | "authenticated";
}
