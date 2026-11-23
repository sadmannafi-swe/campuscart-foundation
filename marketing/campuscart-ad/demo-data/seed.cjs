/**
 * Seeds a LOCAL, THROW-AWAY CampusCart instance with fictional demo data for the
 * marketing video. It refuses to run against anything but 127.0.0.1/localhost.
 *
 *   node seed.cjs <mongo-uri> <db-name>        (dev servers on :5173/:3001)
 *
 * Users, Pre-Owned, blood and BashaLagbe records go through the real API so every
 * server-side rule applies. Stores/products/reviews are written straight into the
 * local database (store approval is an admin flow). Every name, store, listing and
 * review here is invented. Images are 3D renders from ../assets-src/render.
 */
const { MongoClient } = require("/home/user/campuscart-foundation/node_modules/mongodb");
const { randomUUID } = require("node:crypto");
const { request } = require("playwright");

const [URI, DB] = process.argv.slice(2);
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(URI ?? "")) throw new Error("local MongoDB only");
const B = "http://localhost:5173";
const CLOUD = "https://res.cloudinary.com/testcloud/image/upload/v1/campuscart";
const img = (kind, uid, file) => `${CLOUD}/${kind}/${uid}/${file}.png`;
const days = (n) => new Date(Date.now() + n * 86_400_000);
const ymd = (n) => days(n).toISOString().slice(0, 10);

const people = [
  { key: "rafi", name: "Rafi Ahmed", dept: "CSE", batch: "61st" },
  { key: "nusrat", name: "Nusrat Jahan", dept: "EEE", batch: "62nd" },
  { key: "tanvir", name: "Tanvir Hossain", dept: "BBA", batch: "60th" },
  { key: "mim", name: "Sadia Mim", dept: "Pharmacy", batch: "63rd" },
  { key: "arif", name: "Arif Chowdhury", dept: "Civil", batch: "59th" },
  { key: "lamia", name: "Lamia Islam", dept: "English", batch: "62nd" },
];

async function signUp(p, i) {
  const ctx = await request.newContext({ baseURL: B, extraHTTPHeaders: { origin: B } });
  const email = `${p.key}@demo.campuscart.test`;
  const r = await ctx.post("/api/auth/sign-up/email", {
    data: { email, password: "demo-password-123", name: p.name, phone: `0170000${String(1000 + i)}` },
  });
  if (!r.ok()) throw new Error(`sign-up ${email}: ${r.status()} ${await r.text()}`);
  const me = await (await ctx.get("/api/me")).json();
  return { ...p, ctx, id: me.id, email };
}

async function post(u, path, data, method = "post") {
  const r = await u.ctx[method](path, { data });
  if (!r.ok()) throw new Error(`${method} ${path}: ${r.status()} ${await r.text()}`);
  return r.json();
}

(async () => {
  const users = [];
  for (const [i, p] of people.entries()) users.push(await signUp(p, i));
  const U = Object.fromEntries(users.map((u) => [u.key, u]));

  // ---------- Marketplace: 4 approved stores, 11 products, reviews ----------
  const client = await MongoClient.connect(URI);
  const db = client.db(DB);
  const now = new Date();
  const storesSpec = [
    { owner: U.rafi, name: "TechDen DIU", category: "electronics", logo: "logo_techden", featured: true, description: "Student-run gadget corner: laptops, audio and study tech." },
    { owner: U.nusrat, name: "PageStack Books", category: "textbooks", logo: "logo_pagestack", featured: true, description: "Course textbooks and calculators for every semester." },
    { owner: U.tanvir, name: "Hostel Hub", category: "hostel", logo: "logo_hostelhub", featured: true, description: "Desk lamps, bags and everyday hostel essentials." },
    { owner: U.arif, name: "GearUp Campus", category: "electronics", logo: "logo_gearup", featured: false, description: "Keyboards, watches and desk upgrades." },
  ];
  const stores = {};
  for (const s of storesSpec) {
    const sellerId = randomUUID(), storeId = randomUUID();
    await db.collection("sellers").insertOne({ _id: sellerId, user_id: s.owner.id, university_slug: "diu", full_name: s.owner.name, email: s.owner.email, phone: "01700000000", department: s.owner.dept, batch: s.owner.batch, avatar_path: null, status: "approved", order_email_enabled: false, notification_email: null, created_at: now, updated_at: now });
    await db.collection("stores").insertOne({ _id: storeId, seller_id: sellerId, user_id: s.owner.id, university_slug: "diu", name: s.name, description: s.description, category: s.category, contact_number: "01700000000", logo_path: img("stores", s.owner.id, s.logo), status: "approved", rejection_reason: null, approved_at: now, featured_university_slug: s.featured ? "diu" : null, created_at: now, updated_at: now });
    stores[s.name] = { id: storeId, owner: s.owner };
  }
  const productsSpec = [
    ["TechDen DIU", "UltraSlim 14\" Laptop — 16GB / 512GB", "electronics", 58500, 64000, "laptop", "Light 14-inch laptop for coding, slides and streaming. 16GB RAM, 512GB SSD, all-day battery."],
    ["TechDen DIU", "StudyBeats Wireless Headphones", "electronics", 2450, 3200, "headphones", "Closed-back over-ear headphones with soft cushions for long library sessions."],
    ["TechDen DIU", "Nova 5G Smartphone — 8GB / 128GB", "electronics", 21900, 24500, "phone", "6.5-inch display, dual camera, fast charging. Box and charger included."],
    ["PageStack Books", "CSE Core Textbook Set (4 books)", "textbooks", 3200, 4100, "textbooks", "Data Structures, Discrete Maths, Calculus II and Engineering Physics."],
    ["PageStack Books", "Scientific Calculator — 417 functions", "stationery", 1450, null, "calculator", "Exam-approved scientific calculator with natural textbook display."],
    ["Hostel Hub", "Campus Commuter Backpack 25L", "hostel", 1850, 2300, "backpack", "Padded 15.6-inch laptop sleeve, water-resistant fabric, bottle pockets."],
    ["Hostel Hub", "Adjustable LED Study Lamp", "hostel", 990, 1250, "lamp", "Warm, flicker-free light with an adjustable arm for late-night study."],
    ["Hostel Hub", "Travel Charging Kit", "electronics", 1350, null, "accessories", "10,000 mAh power bank, earbuds case and a braided USB-C cable."],
    ["GearUp Campus", "Compact Mechanical Keyboard", "electronics", 3650, 4200, "keyboard", "Hot-swappable 65% keyboard with tactile switches."],
    ["GearUp Campus", "Classic Analog Wristwatch", "fashion", 2200, null, "watch", "Navy dial, stainless case and leather strap."],
    ["PageStack Books", "Thesis Writing Starter Pack", "textbooks", 650, 800, "books_used", "Three reference books for research methods and academic writing."],
  ];
  const products = [];
  for (const [i, [store, name, category, price, was, image, description]] of productsSpec.entries()) {
    const s = stores[store], id = randomUUID();
    await db.collection("products").insertOne({ _id: id, store_id: s.id, user_id: s.owner.id, university_slug: "diu", name, category, price, original_price: was, condition: "new", description, images: [img("products", s.owner.id, image)], in_stock: true, is_active: true, featured_university_slug: i < 4 ? "diu" : null, created_at: days(-(i + 1)), updated_at: now });
    products.push({ id, owner: s.owner });
  }
  // A few fictional reviews so ratings render (demo only; linked to fake delivered orders).
  const comments = ["Exactly as described.", "Quick hand-over on campus.", "Good value for students.", "Works well, happy with it."];
  let n = 0;
  for (const [pi, p] of products.entries()) {
    const reviewers = users.filter((u) => u.id !== p.owner.id).slice(pi % 2, (pi % 2) + 3);
    for (const [ri, r] of reviewers.entries()) {
      await db.collection("reviews").insertOne({ _id: randomUUID(), order_id: randomUUID(), product_id: p.id, buyer_id: r.id, author_name: r.name, rating: (pi + ri) % 4 === 0 ? 4 : 5, comment: comments[n++ % comments.length], created_at: days(-(ri + 2)) });
    }
  }
  await client.close();

  // ---------- Pre-Owned (via API) ----------
  const pre = [
    [U.mim, "Used 13\" Laptop — i5, 8GB RAM", "Electronics", 27500, 42000, "good", "laptop_used", "Two years old, battery 85%, charger included. Perfect for assignments.", "Hall area, DSC"],
    [U.lamia, "Semester Books — Chemistry, Economics, Stats", "Textbooks & Notes", 900, 2100, "fair", "books_used", "Some highlights and notes inside, all pages intact.", "Knowledge Tower"],
    [U.arif, "City Bicycle — 26\" Green", "Sports & Fitness", 6800, 11500, "good", "bicycle", "Smooth ride, new brake pads. Great for getting around Ashulia.", "Khagan"],
    [U.nusrat, "Scientific Calculator (barely used)", "Stationery", 850, 1450, "like-new", "calculator_used", "Used for one semester, with cover.", "Library gate"],
    [U.tanvir, "Smartphone 6GB/128GB with case", "Electronics", 9500, 18000, "good", "phone_used", "Minor marks on the frame, screen is perfect.", "Main gate"],
    [U.rafi, "Power Bank, Earbuds Case & Cable", "Other", 1100, 2000, "like-new", "accessories", "Selling as a bundle, all working.", "Food court"],
  ];
  for (const [u, title, category, price, original_price, condition, image, description, location] of pre)
    await post(u, "/api/preowned", { university_slug: "diu", title, description, category, price, original_price, condition, images: [img("preowned", u.id, image)], location });

  // ---------- Blood Donation (via API): planned needs + donor profiles ----------
  await post(U.lamia, "/api/blood/requests", { university_slug: "diu", blood_group: "B+", hospital_name: "City General Hospital (demo)", hospital_location: "Savar, Dhaka", needed_on: ymd(5), donors_needed: 2, contact_preference: "messages", description: "Planned surgery next week for a family member. Looking for two donors." });
  await post(U.arif, "/api/blood/requests", { university_slug: "diu", blood_group: "O-", hospital_name: "Lakeside Medical Centre (demo)", hospital_location: "Dhanmondi, Dhaka", needed_on: ymd(8), donors_needed: 1, contact_preference: "messages", description: "Scheduled treatment. Please message if you can help." });
  await post(U.mim, "/api/blood/requests", { university_slug: "diu", blood_group: "A+", hospital_name: "Green View Clinic (demo)", hospital_location: "Ashulia, Savar", needed_on: ymd(12), donors_needed: 1, contact_preference: "messages", description: "Routine transfusion for a relative." });
  const donors = [
    [U.rafi, "A+", "Ashulia", "available"], [U.nusrat, "O+", "Savar", "available"], [U.tanvir, "B+", "Khagan", "available"], [U.mim, "AB+", "Dhanmondi", "available"], [U.lamia, "O-", "Ashulia", "unavailable"],
  ];
  for (const [u, blood_group, location, availability] of donors)
    await post(u, "/api/blood/donors/me", { university_slug: "diu", name: u.name, blood_group, department: u.dept, batch: u.batch, location, contact_preference: "messages", availability }, "put");

  // ---------- BashaLagbe (via API) ----------
  const fac = (o) => ({ attached_bathroom: true, bathroom_type: "private", balcony: true, kitchen: true, kitchen_type: "shared", furnished: true, electricity: true, water: true, wifi: true, gas: false, other: "", rules: "", ...o });
  const basha = [
    [U.tanvir, "Bright single room, 10 min walk to campus", "single_room", 5500, "Khagan, Ashulia", "room_single", fac({ other: "Generator backup", rules: "Gate closes at 11 pm" }), null],
    [U.arif, "Shared room — 1 seat for a CSE student", "shared_room", 3200, "Birulia Road, Ashulia", "room_shared", fac({ attached_bathroom: false, bathroom_type: "shared", balcony: false }), { available_seats: 1, current_roommates: 1, preferred_type: "Quiet student", gender_preference: "Male" }],
    [U.nusrat, "2-bed family apartment near Daffodil Smart City", "apartment", 14500, "Daffodil Smart City area", "apartment", fac({ kitchen_type: "private", gas: true, furnished: false }), null],
  ];
  for (const [u, title, type, rent, area, image, facilities, roommate] of basha)
    await post(u, "/api/basha", { university_slug: "diu", title, type, rent, advance: rent, available_from: ymd(8), area, address: "Shared after contact", address_public: false, map_url: "", images: [img("basha", u.id, image)], description: "Clean, well-lit and quiet. Close to shops and transport.", facilities, ...(roommate ? { roommate } : {}) });

  console.log("seeded", { users: users.length, stores: storesSpec.length, products: productsSpec.length, preowned: pre.length, basha: basha.length });
  for (const u of users) await u.ctx.dispose();
})().catch((e) => { console.error(e); process.exit(1); });
