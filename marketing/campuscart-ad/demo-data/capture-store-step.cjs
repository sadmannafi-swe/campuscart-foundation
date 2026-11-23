// Walks the real seller sign-up with a NEW fictional student up to the store step
// (account is created in the local demo DB; the store form is filled but not submitted).
const { chromium } = require("playwright");
const path = require("node:path"), fs = require("node:fs");
const B = "http://localhost:5173", OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/sell/register", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  await p.getByText(/Daffodil International University/i).first().click();
  await p.getByRole("button", { name: /continue/i }).first().click(); await p.waitForTimeout(700);
  await p.getByPlaceholder("Enter your full name").fill("Rafi Ahmed");
  await p.getByPlaceholder("Enter your email").fill("rafi.store@demo.campuscart.test");
  await p.getByPlaceholder("Enter your phone number").fill("01700000000");
  await p.getByPlaceholder("Enter your student ID").fill("000-00-0000");
  await p.getByText("Select your department").click(); await p.waitForTimeout(300);
  await p.getByRole("option").first().click(); await p.waitForTimeout(200);
  await p.getByPlaceholder("e.g. 61st").fill("61st");
  await p.getByPlaceholder("Create a password").fill("demo-password-123");
  await p.getByRole("button", { name: /create account/i }).click(); await p.waitForTimeout(2500);
  await p.getByPlaceholder("Enter your store name").fill("TechDen DIU");
  await p.getByPlaceholder(/What do you sell/).fill("Student-run gadget corner: laptops, audio and study tech.");
  const cat = p.getByText("Select category"); if (await cat.count()) { await cat.click(); await p.waitForTimeout(300); await p.getByRole("option", { name: /electronics/i }).first().click(); }
  await p.getByPlaceholder("Enter contact number").fill("01700000000");
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, "s03b-register-store-view.png") });
  await p.screenshot({ path: path.join(OUT, "s03b-register-store.png"), fullPage: true });
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  const m = JSON.parse(fs.readFileSync(path.join(OUT, "meta.json"), "utf8"));
  m["s03b-register-store"] = { header: null, nav: null, height: h };
  fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(m, null, 2));
  console.log("ok height", h, "errors", errs);
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
