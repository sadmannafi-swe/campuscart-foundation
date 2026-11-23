/**
 * Captures every screen used by the 75-second ad from the LOCAL demo instance
 * (seeded by seed.cjs + this script's demo orders). Real CampusCart UI only.
 *   node capture-v2.cjs <out-dir>
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const B = "http://localhost:5173";
const OUT = process.argv[2];
const DEMO = path.join(__dirname, "../public/demo");
const PW = "demo-password-123";
fs.mkdirSync(OUT, { recursive: true });
const meta = {};
const errors = [];

async function newCtx(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "reduce",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await ctx.route("https://res.cloudinary.com/**", (r) => {
    const file = path.join(DEMO, path.basename(new URL(r.request().url()).pathname));
    return fs.existsSync(file) ? r.fulfill({ status: 200, contentType: "image/png", body: fs.readFileSync(file) }) : r.fulfill({ status: 404 });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => { if (r.status() >= 400 && !/\/api\/(me|auth\/get-session|seller\/me)/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  return { ctx, page };
}
const signIn = (ctx, email) => ctx.request.post(B + "/api/auth/sign-in/email", { data: { email, password: PW }, headers: { origin: B } });
const api = async (ctx, p, method = "get", data) => {
  const r = await ctx.request[method](B + "/api" + p, data ? { data, headers: { origin: B } } : { headers: { origin: B } });
  if (!r.ok()) throw new Error(`${method} ${p} ${r.status()} ${await r.text()}`);
  return r.json();
};

const CHROME = 'header, nav[aria-label="Mobile navigation"], nav[aria-label="Seller navigation"]';
async function shot(page, name, url, { full = true, before, settle = 1200 } = {}) {
  if (url) { await page.goto(B + url, { waitUntil: "networkidle" }); await page.waitForTimeout(settle); }
  if (before) await before(page);
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(100); }
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(OUT, name + "-view.png") });
  if (!full) { meta[name] = { static: true }; console.log("captured", name, "(view)"); return; }
  const rect = (sel) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return r.height ? { y: r.top, h: r.height } : null; }).catch(() => null);
  const header = await rect("header");
  const nav = await rect('nav[aria-label="Mobile navigation"], nav[aria-label="Seller navigation"]');
  const tag = await page.addStyleTag({ content: `${CHROME} { visibility: hidden !important; }` });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true });
  meta[name] = { header, nav, height: await page.evaluate(() => document.documentElement.scrollHeight) };
  await tag.evaluate((n) => n.remove());
  console.log("captured", name, JSON.stringify(meta[name]));
}

(async () => {
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });

  // ---------- demo orders (fictional buyers) so the seller screens are not empty ----------
  const admin = await newCtx(browser);
  await signIn(admin.ctx, "lamia@demo.campuscart.test");
  const products = await api(admin.ctx, "/products?university=diu");
  const byName = (s) => products.find((p) => p.name.startsWith(s));
  const order = (ctx, items, name) => api(ctx, "/orders", "post", { items, name, phone: "01700000000", address: "Hall area, Daffodil Smart City", note: "", university: "diu" });
  await order(admin.ctx, [{ product_id: byName("StudyBeats").id, quantity: 1 }], "Lamia Islam");
  const mimCtx = await newCtx(browser);
  await signIn(mimCtx.ctx, "mim@demo.campuscart.test");
  await order(mimCtx.ctx, [{ product_id: byName("UltraSlim").id, quantity: 1 }], "Sadia Mim");
  const arif = await newCtx(browser);
  await signIn(arif.ctx, "arif@demo.campuscart.test");
  await order(arif.ctx, [{ product_id: byName("Nova 5G").id, quantity: 1 }], "Arif Chowdhury");
  const seller = await newCtx(browser);
  await signIn(seller.ctx, "rafi@demo.campuscart.test");
  const sellerOrders = await api(seller.ctx, "/seller/orders").catch(() => []);
  if (sellerOrders[0]) await api(seller.ctx, `/seller/orders/${sellerOrders[0].id}/status`, "post", { status: "confirmed" }).catch((e) => errors.push(String(e)));
  console.log("demo orders:", sellerOrders.length);

  // ---------- buyer (signed in as a demo buyer) ----------
  const buyer = await newCtx(browser);
  await signIn(buyer.ctx, "nusrat@demo.campuscart.test");
  const bp = buyer.page;
  const slug = (n, id) => `${n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${id.slice(0, 8)}`;
  const laptop = byName("UltraSlim"), headphones = byName("StudyBeats");
  await shot(bp, "b01-diu", "/diu");
  await shot(bp, "b02-stores", "/stores");
  await shot(bp, "b03-products", "/products");
  await shot(bp, "b04-product", `/products/${slug(laptop.name, laptop.id)}`);
  // add to cart through the real button, then capture the confirmation state
  await bp.getByRole("button", { name: /add to cart/i }).first().click();
  await bp.waitForTimeout(900);
  await shot(bp, "b05-added", null, { full: false });
  await bp.goto(B + `/products/${slug(headphones.name, headphones.id)}`, { waitUntil: "networkidle" });
  await bp.waitForTimeout(800);
  await bp.getByRole("button", { name: /add to cart/i }).first().click();
  await bp.waitForTimeout(600);
  await shot(bp, "b06-cart", "/cart");
  await shot(bp, "b07-checkout", "/checkout", {
    before: async (p) => {
      const fill = async (re, v) => { const l = p.getByLabel(re).first(); if (await l.count()) await l.fill(v); };
      await fill(/name/i, "Nusrat Jahan");
      await fill(/phone/i, "01700000000");
      await fill(/address/i, "Hall area, Daffodil Smart City");
      await p.waitForTimeout(300);
    },
  });

  // ---------- seller journey ----------
  const guest = await newCtx(browser);
  await shot(guest.page, "s01-sell", "/sell", { full: false });
  await shot(guest.page, "s02-register", "/sell/register", { full: false });
  // walk the real registration form with demo values (not submitted)
  try {
    const p = guest.page;
    await p.getByText(/Daffodil International University/i).first().click();
    await p.waitForTimeout(300);
    await p.getByRole("button", { name: /continue/i }).first().click();
    await p.waitForTimeout(700);
    await p.getByPlaceholder("Enter your full name").fill("Rafi Ahmed");
    await p.getByPlaceholder("Enter your email").fill("rafi.demo@example.com");
    await p.getByPlaceholder("Enter your phone number").fill("01700000000");
    await p.getByPlaceholder("Enter your student ID").fill("000-00-0000");
    await p.getByPlaceholder("e.g. 61st").fill("61st");
    await p.getByPlaceholder("Create a password").fill("demo-password-123");
    await p.waitForTimeout(300);
    await shot(p, "s03-register-account", null);
  } catch (e) { errors.push("register walk: " + e.message); }
  await shot(guest.page, "s04-login", "/sell/login", { full: false });

  const sp = seller.page;
  await shot(sp, "s05-dashboard", "/sell/dashboard");
  await shot(sp, "s06-store-profile", "/sell/dashboard/store");
  await shot(sp, "s07-products", "/sell/dashboard/products");
  await shot(sp, "s08-product-edit", `/sell/dashboard/products/${laptop.id}`);
  await shot(sp, "s09-product-new", "/sell/dashboard/products/new", {
    before: async (p) => {
      await p.getByPlaceholder(/product name/i).first().fill("Wireless Mouse — Silent Click").catch(() => {});
      await p.getByPlaceholder(/enter price/i).first().fill("850").catch(() => {});
      await p.getByPlaceholder(/describe/i).first().fill("Quiet clicks for the library, 12-month battery.").catch(() => {});
    },
  });
  await shot(sp, "s10-orders", "/sell/dashboard/orders");
  const stores = await api(buyer.ctx, "/stores?university=diu");
  const techden = stores.find((x) => x.name === "TechDen DIU");
  await shot(bp, "s11-storefront", `/stores/${techden.id}`);

  // ---------- services ----------
  await shot(bp, "p01-preowned", "/preowned");
  const pre = await api(buyer.ctx, "/preowned?university=diu");
  await shot(bp, "p02-preowned-detail", `/preowned/${pre.find((x) => x.title.startsWith("Used 13")).id}`);
  await shot(bp, "p03-preowned-bike", `/preowned/${pre.find((x) => x.title.startsWith("City Bicycle")).id}`);
  await shot(bp, "m01-menu", "/diu", { full: false, before: async (p) => { await p.getByRole("button", { name: "Open menu" }).click(); await p.waitForTimeout(700); } });
  await shot(bp, "d01-blood", "/blood");
  await shot(bp, "d02-blood-bplus", "/blood", { before: async (p) => { await p.getByRole("button", { name: "B+", exact: true }).first().click().catch(() => {}); await p.waitForTimeout(800); } });
  const reqs = await api(buyer.ctx, "/blood/requests?university=diu");
  await shot(bp, "d03-request", `/blood/requests/${reqs[0].id}`);
  await shot(bp, "d04-donors", "/blood?tab=donors");
  const donors = await api(buyer.ctx, "/blood/donors?university=diu");
  await shot(bp, "d05-donor", `/blood/donors/${donors[0].id}`);
  await shot(bp, "h01-basha", "/basha");
  const basha = await api(buyer.ctx, "/basha?university=diu");
  await shot(bp, "h02-basha-single", `/basha/${basha.find((b) => b.type === "single_room").id}`);
  await shot(bp, "h03-basha-shared", `/basha/${basha.find((b) => b.type === "shared_room").id}`);
  await shot(bp, "h04-basha-apartment", `/basha/${basha.find((b) => b.type === "apartment").id}`);

  fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 2));
  console.log("errors:", errors.length ? errors.slice(0, 12) : "none");
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
