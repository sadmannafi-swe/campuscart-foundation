/**
 * Captures the real CampusCart mobile UI from the LOCAL dev server (seeded by
 * seed.cjs) at iPhone-class width. Demo image URLs (fake Cloudinary cloud
 * "testcloud") are served from ../public/demo.
 *   node capture.cjs <out-dir>
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const B = "http://localhost:5173";
const OUT = process.argv[2];
const DEMO = path.join(__dirname, "../public/demo");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await ctx.route("https://res.cloudinary.com/**", (r) => {
    const file = path.join(DEMO, path.basename(new URL(r.request().url()).pathname));
    if (!fs.existsSync(file)) return r.fulfill({ status: 404 });
    return r.fulfill({ status: 200, contentType: "image/png", body: fs.readFileSync(file) });
  });
  const api = async (p) => (await ctx.request.get(B + "/api" + p)).json();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("/api/me")) errors.push(`${r.status()} ${r.url()}`); });

  const meta = {};
  async function shot(name, url, { full = true, before } = {}) {
    await page.goto(B + url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    if (full) {
      // walk the page so lazy images and reveal-on-scroll content load
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(600);
    }
    if (before) await before();
    if (!full) {
      await page.screenshot({ path: path.join(OUT, name + ".png") });
      console.log("captured", name);
      return;
    }
    // viewport frame (for the header and bottom-nav overlays), then the scrolling body without them
    await page.screenshot({ path: path.join(OUT, name + "-view.png") });
    const rect = (sel) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { y: r.top, h: r.height }; }).catch(() => null);
    const header = await rect("header");
    const nav = await rect('nav[aria-label="Mobile navigation"]');
    await page.addStyleTag({ content: 'header, nav[aria-label="Mobile navigation"] { visibility: hidden !important; }' });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    meta[name] = { header, nav, height };
    console.log("captured", name, JSON.stringify(meta[name]));
  }

  const products = await api("/products?university=diu");
  const laptop = products.find((p) => p.name.startsWith("UltraSlim"));
  const slug = (n, id) => `${n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${id.slice(0, 8)}`;
  const preowned = await api("/preowned?university=diu");
  const usedLaptop = preowned.find((p) => p.title.startsWith("Used 13"));
  const requests = await api("/blood/requests?university=diu");
  const donors = await api("/blood/donors?university=diu");
  const basha = await api("/basha?university=diu");
  const single = basha.find((b) => b.type === "single_room");

  await shot("01-diu", "/diu");
  await shot("02-diu-top", "/diu", { full: false });
  await shot("03-product", `/products/${slug(laptop.name, laptop.id)}`);
  await shot("04-preowned", "/preowned");
  await shot("05-preowned-detail", `/preowned/${usedLaptop.id}`);
  await shot("06-blood", "/blood");
  await shot("07-blood-donors", "/blood?tab=donors");
  await shot("08-blood-request", `/blood/requests/${requests[0].id}`);
  await shot("09-donor", `/blood/donors/${donors[0].id}`);
  await shot("10-basha", "/basha");
  await shot("11-basha-detail", `/basha/${single.id}`);
  await shot("12-menu", "/diu", {
    full: false,
    before: async () => { await page.getByRole("button", { name: "Open menu" }).click(); await page.waitForTimeout(700); },
  });
  await shot("13-landing", "/", { full: false });

  fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 2));
  console.log("errors:", errors.length ? errors.slice(0, 10) : "none");
  await browser.close();
})();
