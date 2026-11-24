import { attachDatabasePool } from "@vercel/functions/db-connections";
import {
  MongoClient,
  type Collection,
  type Db,
  type Document,
  type IndexDescription,
} from "mongodb";
import type {
  BashaFacilities,
  BashaRoommate,
  BashaStatus,
  BashaType,
  BloodGroup,
  BloodRequestStatus,
  ChatKind,
  ContactPreference,
  DonorAvailability,
  Moderation,
  PreOwnedCondition,
  PreOwnedStatus,
  ReportReason,
  ReportStatus,
  ReportTarget,
} from "../../shared/types";

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

/**
 * Pool sizing for serverless: one instance serves many concurrent requests, and a
 * query to Atlas in the same region takes a few milliseconds, so a small pool is
 * plenty. Keeping it small (and closing idle sockets) keeps the total across all
 * warm instances well under the cluster's connection limit (M0: 500).
 */
export const POOL_OPTIONS = {
  maxPoolSize: 5,
  minPoolSize: 0,
  maxIdleTimeMS: 10_000,
  waitQueueTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 8000,
  appName: "campuscart",
} as const;

export function getClient(): MongoClient {
  if (!client) {
    client = new MongoClient(getMongoUri(), POOL_OPTIONS);
    // On Vercel (Fluid compute) keep the instance alive just long enough to close
    // idle connections before it is suspended, so they don't pile up on Atlas.
    // Outside Vercel this is a no-op.
    attachDatabasePool(client);
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
  /** Missing on older rows = Marketplace product. Other kinds keep `product_id` = "<kind>:<id>". */
  kind?: ChatKind;
  context_id?: string | null;
  context_subtitle?: string | null;
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

// ---- Campus modules ----------------------------------------------------------
// Each record points at its owner (Better Auth user id) and university; owner names
// are read from the user collection when needed instead of being copied here.

export interface PreOwnedDoc {
  _id: string;
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
  sold_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BloodRequestDoc {
  _id: string;
  owner_id: string;
  university_slug: string;
  patient_name: string | null;
  blood_group: BloodGroup;
  hospital_name: string;
  hospital_location: string;
  needed_on: Date;
  donors_needed: number;
  contact_preference: ContactPreference;
  contact_phone: string | null;
  description: string;
  status: BloodRequestStatus;
  moderation: Moderation;
  created_at: Date;
  updated_at: Date;
}

export interface DonorProfileDoc {
  _id: string;
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
  created_at: Date;
  updated_at: Date;
}

export interface BashaDoc {
  _id: string;
  owner_id: string;
  university_slug: string;
  title: string;
  type: BashaType;
  rent: number;
  advance: number | null;
  available_from: Date;
  area: string;
  address: string;
  address_public: boolean;
  map_url: string | null;
  images: string[];
  description: string;
  facilities: BashaFacilities;
  roommate: BashaRoommate | null;
  status: BashaStatus;
  moderation: Moderation;
  created_at: Date;
  updated_at: Date;
}

export interface ReportDoc {
  _id: string;
  target_type: ReportTarget;
  target_id: string;
  reporter_id: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  reviewed_at: Date | null;
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
  preowned: () => getDb().collection<PreOwnedDoc>("preowned_listings"),
  bloodRequests: () => getDb().collection<BloodRequestDoc>("blood_requests"),
  donors: () => getDb().collection<DonorProfileDoc>("donor_profiles"),
  basha: () => getDb().collection<BashaDoc>("bashalagbe_listings"),
  reports: () => getDb().collection<ReportDoc>("reports"),
};

// ---- Schema validation for the module collections ------------------------------
// The API validates every write with zod first; these MongoDB validators are a
// second line so a bad write from anywhere else can't corrupt the data.

const str = { bsonType: "string" };
const date = { bsonType: "date" };
const num = { bsonType: ["double", "int", "long", "decimal"] };
const moderation = { enum: ["visible", "hidden"] };
const base = ["_id", "owner_id", "university_slug", "moderation", "created_at", "updated_at"];

const validators: Record<string, Document> = {
  preowned_listings: {
    $jsonSchema: {
      bsonType: "object",
      required: [...base, "title", "price", "condition", "images", "status", "location"],
      properties: {
        owner_id: str,
        university_slug: str,
        title: { bsonType: "string", minLength: 3, maxLength: 120 },
        price: { ...num, minimum: 0 },
        condition: { enum: ["like-new", "good", "fair", "used"] },
        images: { bsonType: "array", maxItems: 8, items: str },
        status: { enum: ["available", "sold"] },
        moderation,
        created_at: date,
        updated_at: date,
      },
    },
  },
  blood_requests: {
    $jsonSchema: {
      bsonType: "object",
      required: [...base, "blood_group", "hospital_name", "needed_on", "donors_needed", "status"],
      properties: {
        owner_id: str,
        blood_group: { enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
        needed_on: date,
        donors_needed: { ...num, minimum: 1 },
        contact_preference: { enum: ["messages", "phone"] },
        status: { enum: ["active", "fulfilled", "cancelled"] },
        moderation,
        created_at: date,
        updated_at: date,
      },
    },
  },
  donor_profiles: {
    $jsonSchema: {
      bsonType: "object",
      required: [...base, "name", "blood_group", "availability"],
      properties: {
        owner_id: str,
        blood_group: { enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
        contact_preference: { enum: ["messages", "phone"] },
        availability: { enum: ["available", "unavailable"] },
        moderation,
        created_at: date,
        updated_at: date,
      },
    },
  },
  bashalagbe_listings: {
    $jsonSchema: {
      bsonType: "object",
      required: [...base, "title", "type", "rent", "available_from", "area", "status", "images"],
      properties: {
        owner_id: str,
        type: { enum: ["single_room", "shared_room", "apartment"] },
        rent: { ...num, minimum: 0 },
        available_from: date,
        images: { bsonType: "array", maxItems: 10, items: str },
        status: { enum: ["available", "rented", "unavailable"] },
        moderation,
        created_at: date,
        updated_at: date,
      },
    },
  },
  reports: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "_id",
        "target_type",
        "target_id",
        "reporter_id",
        "reason",
        "status",
        "created_at",
      ],
      properties: {
        target_type: { enum: ["preowned", "blood_request", "donor", "basha"] },
        status: { enum: ["open", "reviewed", "dismissed"] },
        created_at: date,
      },
    },
  },
};

/** Same validator already on the collection? (Skips a collMod round-trip.) */
const sameValidator = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Applies the module validators. They are a second line of defence only (zod
 * already validates every write), so this is best-effort: a database user that
 * may not run `collMod` — Atlas's built-in `readWrite` role, for example — must
 * never take the API down. Failures are logged and the API carries on.
 */
async function ensureValidators() {
  const database = getDb();
  const existing = new Map(
    (await database.listCollections({}, { nameOnly: false }).toArray()).map((c) => [
      c.name,
      (c as { options?: { validator?: unknown } }).options?.validator,
    ]),
  );
  await Promise.all(
    Object.entries(validators).map(async ([name, validator]) => {
      try {
        if (existing.has(name)) {
          if (sameValidator(existing.get(name), validator)) return;
          await database.command({ collMod: name, validator, validationLevel: "moderate" });
        } else {
          await database.createCollection(name, { validator, validationLevel: "moderate" });
        }
      } catch (err) {
        // 48 = NamespaceExists: another instance created it first.
        if ((err as { code?: number }).code === 48) return;
        console.warn(
          `[db] schema validator for "${name}" not applied (${(err as Error).message}); continuing without it`,
        );
      }
    }),
  );
}

const INDEX_RETRY_MS = 60_000;

type IndexSpec = { collection: string; key: IndexDescription["key"]; unique?: boolean };
const ix = (collection: string, key: Record<string, 1 | -1>, unique?: boolean): IndexSpec => ({
  collection,
  key,
  ...(unique ? { unique } : {}),
});

/** Every index the app relies on (core marketplace first, then the campus modules). */
export const INDEX_SPECS: IndexSpec[] = [
  ix("sellers", { user_id: 1 }, true),
  ix("stores", { seller_id: 1 }, true),
  ix("stores", { status: 1, university_slug: 1 }),
  ix("products", { store_id: 1, created_at: -1 }),
  ix("products", { is_active: 1, created_at: -1 }),
  ix("orders", { buyer_id: 1, created_at: -1 }),
  ix("orders", { seller_user_id: 1, created_at: -1 }),
  ix("reviews", { order_id: 1, product_id: 1 }, true),
  ix("reviews", { product_id: 1, created_at: -1 }),
  ix("notifications", { user_id: 1, audience: 1, created_at: -1 }),
  ix("conversations", { buyer_id: 1, product_id: 1 }, true),
  ix("conversations", { seller_user_id: 1, last_message_at: -1 }),
  ix("messages", { conversation_id: 1, created_at: 1 }),
  ix("email_outbox", { kind: 1, order_id: 1 }, true),
  ix("email_outbox", { status: 1, created_at: 1 }),
  ix("preowned_listings", { university_slug: 1, moderation: 1, status: 1, created_at: -1 }),
  ix("preowned_listings", { owner_id: 1, created_at: -1 }),
  ix("blood_requests", { university_slug: 1, moderation: 1, status: 1, created_at: -1 }),
  ix("blood_requests", { owner_id: 1, created_at: -1 }),
  ix("donor_profiles", { owner_id: 1 }, true),
  ix("donor_profiles", { university_slug: 1, moderation: 1, availability: 1, blood_group: 1 }),
  ix("bashalagbe_listings", { university_slug: 1, moderation: 1, status: 1, created_at: -1 }),
  ix("bashalagbe_listings", { owner_id: 1, created_at: -1 }),
  ix("reports", { reporter_id: 1, target_type: 1, target_id: 1 }, true),
  ix("reports", { status: 1, created_at: -1 }),
];

const keyOf = (key: unknown) => JSON.stringify(key);

/**
 * The indexes from INDEX_SPECS that don't exist yet. Reads only: one listIndexes
 * per collection, all in parallel. A missing collection simply has none yet.
 */
export async function missingIndexes(): Promise<IndexSpec[]> {
  const database = getDb();
  const names = [...new Set(INDEX_SPECS.map((s) => s.collection))];
  const existing = new Map<string, Set<string>>();
  await Promise.all(
    names.map(async (name) => {
      try {
        const list = await database.collection(name).listIndexes().toArray();
        existing.set(name, new Set(list.map((i) => keyOf(i["key"]))));
      } catch (err) {
        // 26 = NamespaceNotFound: the collection doesn't exist yet.
        if ((err as { code?: number }).code !== 26) throw err;
        existing.set(name, new Set());
      }
    }),
  );
  return INDEX_SPECS.filter((s) => !existing.get(s.collection)?.has(keyOf(s.key)));
}

/** Module collections whose schema validator is missing or out of date. */
async function validatorsNeeded(): Promise<boolean> {
  const list = await getDb().listCollections({}, { nameOnly: false }).toArray();
  const current = new Map(
    list.map((c) => [c.name, (c as { options?: { validator?: unknown } }).options?.validator]),
  );
  return Object.entries(validators).some(
    ([name, v]) => !current.has(name) || !sameValidator(current.get(name), v),
  );
}

/**
 * Makes sure the indexes exist, once per process. On a database that is already
 * set up this costs two parallel rounds of reads (listCollections + listIndexes)
 * and writes nothing; it only creates what is missing (a new database, or an
 * index added in a later release). createIndex is idempotent on the server, so
 * two instances racing here is harmless.
 */
export function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const [missing, needValidators] = await Promise.all([missingIndexes(), validatorsNeeded()]);
    // Validators go first so a new module collection is created with its validator
    // (createIndex would otherwise create it without one).
    if (needValidators) await ensureValidators();
    await Promise.all(
      missing.map((s) =>
        getDb()
          .collection(s.collection)
          .createIndex(s.key, s.unique ? { unique: true } : {}),
      ),
    );
  })().catch((err) => {
    // Retry on a later request, but not on every request while the cause persists.
    setTimeout(() => (indexesReady = undefined), INDEX_RETRY_MS).unref?.();
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
