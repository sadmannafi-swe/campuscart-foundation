import { MongoClient, type Collection, type Db, type Document } from "mongodb";

/**
 * One MongoClient per process. On Vercel the module is reused across warm
 * invocations, so connections are pooled instead of re-opened per request.
 */
let client: MongoClient | undefined;
let db: Db | undefined;
let indexesReady: Promise<void> | undefined;

export function getMongoUri(): string {
  const uri = process.env["MONGODB_URI"];
  if (!uri) throw new Error("MONGODB_URI is not set");
  return uri;
}

export function getClient(): MongoClient {
  if (!client) {
    client = new MongoClient(getMongoUri(), {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      appName: "campuscart",
    });
  }
  return client;
}

export function getDb(): Db {
  if (!db) db = getClient().db(process.env["MONGODB_DB"] || "campuscart");
  return db;
}

/** Test helper: point the module at another client/database. */
export function setDbForTests(c: MongoClient, name: string) {
  client = c;
  db = c.db(name);
  indexesReady = undefined;
}

// ---- Collection documents (string ids, Date timestamps) -------------------

export interface SellerDoc {
  _id: string;
  user_id: string;
  university_slug: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  batch: string;
  avatar_path: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  order_email_enabled: boolean;
  notification_email: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SellerIdentityDoc {
  _id: string; // seller id
  user_id: string;
  student_id: string;
  student_id_image: string | null; // Cloudinary public_id (authenticated)
  created_at: Date;
}

export interface StoreDoc {
  _id: string;
  seller_id: string;
  user_id: string;
  university_slug: string;
  name: string;
  description: string;
  category: string;
  contact_number: string;
  logo_path: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejection_reason: string | null;
  approved_at: Date | null;
  featured_university_slug: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProductDoc {
  _id: string;
  store_id: string;
  user_id: string;
  university_slug: string;
  name: string;
  category: string;
  price: number;
  /** Optional "was" price; when set it is always greater than `price`. */
  original_price?: number | null;
  condition: string;
  description: string;
  images: string[];
  in_stock: boolean;
  is_active: boolean;
  featured_university_slug: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemDoc {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface OrderDoc {
  _id: string;
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
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  /** Set when the seller marks the order delivered (earnings date). */
  delivered_at?: Date | null;
  items: OrderItemDoc[];
  created_at: Date;
  updated_at: Date;
}

export interface ReviewDoc {
  _id: string;
  order_id: string;
  product_id: string;
  buyer_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: Date;
}

export interface NotificationDoc {
  _id: string;
  user_id: string;
  /** Which side of the marketplace the alert is for (one user can be both). */
  audience: "buyer" | "seller";
  kind: string;
  title: string;
  body: string;
  order_id: string | null;
  read_at: Date | null;
  created_at: Date;
}

export interface ConversationDoc {
  _id: string;
  product_id: string;
  store_id: string;
  seller_user_id: string;
  buyer_id: string;
  university_slug: string;
  product_name: string;
  product_price: number;
  product_image: string | null;
  buyer_name: string;
  first_message_at: Date | null;
  last_message_at: Date | null;
  last_message_preview: string;
  created_at: Date;
}

export interface MessageDoc {
  _id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: "buyer" | "seller";
  body: string;
  read_at: Date | null;
  created_at: Date;
}

export interface EmailJobDoc {
  _id: string;
  kind: "seller_new_order";
  order_id: string;
  to_email: string;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  last_error: string | null;
  locked_at: Date | null;
  sent_at: Date | null;
  created_at: Date;
}

export const col = {
  sellers: () => getDb().collection<SellerDoc>("sellers"),
  sellerIdentities: () => getDb().collection<SellerIdentityDoc>("seller_identities"),
  stores: () => getDb().collection<StoreDoc>("stores"),
  products: () => getDb().collection<ProductDoc>("products"),
  orders: () => getDb().collection<OrderDoc>("orders"),
  reviews: () => getDb().collection<ReviewDoc>("reviews"),
  notifications: () => getDb().collection<NotificationDoc>("notifications"),
  conversations: () => getDb().collection<ConversationDoc>("conversations"),
  messages: () => getDb().collection<MessageDoc>("messages"),
  emailOutbox: () => getDb().collection<EmailJobDoc>("email_outbox"),
  users: () => getDb().collection<Document>("user"),
};

/** Create indexes once per process (idempotent on the server). */
export function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    await Promise.all([
      col.sellers().createIndex({ user_id: 1 }, { unique: true }),
      col.stores().createIndex({ seller_id: 1 }, { unique: true }),
      col.stores().createIndex({ status: 1, university_slug: 1 }),
      col.products().createIndex({ store_id: 1, created_at: -1 }),
      col.products().createIndex({ is_active: 1, created_at: -1 }),
      col.orders().createIndex({ buyer_id: 1, created_at: -1 }),
      col.orders().createIndex({ seller_user_id: 1, created_at: -1 }),
      col.reviews().createIndex({ order_id: 1, product_id: 1 }, { unique: true }),
      col.reviews().createIndex({ product_id: 1, created_at: -1 }),
      col.notifications().createIndex({ user_id: 1, audience: 1, created_at: -1 }),
      col.conversations().createIndex({ buyer_id: 1, product_id: 1 }, { unique: true }),
      col.conversations().createIndex({ seller_user_id: 1, last_message_at: -1 }),
      col.messages().createIndex({ conversation_id: 1, created_at: 1 }),
      col.emailOutbox().createIndex({ kind: 1, order_id: 1 }, { unique: true }),
      col.emailOutbox().createIndex({ status: 1, created_at: 1 }),
    ]);
  })().catch((err) => {
    indexesReady = undefined;
    throw err;
  });
  return indexesReady;
}

// ---- Serialisation ---------------------------------------------------------

type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T as K extends "_id" ? "id" : K]: Serialized<T[K]> }
      : T;

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k === "_id" ? "id" : k] = serializeValue(v);
    return out;
  }
  return value;
}

/** `_id` → `id`, Date → ISO string. */
export function toApi<T extends object>(doc: T): Serialized<T> {
  return serializeValue(doc) as Serialized<T>;
}

export type { Collection };
