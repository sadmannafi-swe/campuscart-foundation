# CampusCart

**Your Campus. Your Marketplace.** — a multi-campus student marketplace where
verified university students open stores and sell to students on their campus.
DIU (Daffodil International University) is live; NSU, BRAC, DU and EWU are
prepared as "coming soon" marketplaces.

Live: <https://campuscart-foundation.vercel.app/>

## Stack (MERN)

| Layer | Technology |
| --- | --- |
| **M**ongoDB | MongoDB Atlas, official `mongodb` driver, transactions for checkout |
| **E**xpress | Express 5 API in `server/`, deployed as one Vercel Node.js function at `/api/*` |
| **R**eact | React 19 SPA, TanStack Router (file routes in `src/routes`), TanStack Query, Tailwind v4 + shadcn/Radix |
| **N**ode | Node 22 |
| Auth | [Better Auth](https://better-auth.com) — e-mail/password, sessions in MongoDB, admin roles, password reset, optional e-mail verification |
| Images | Cloudinary (signed direct uploads; student ID photos are private) |
| E-mail | Gmail API (seller new-order e-mails, password reset, verification) |

```
server/          Express API
  app.ts           routes, CSRF/origin check, error handling
  lib/             db (MongoDB), auth (Better Auth), cloudinary, gmail, outbox, notify
  routes/          public, account, orders, seller, chat, admin
  api.test.ts      end-to-end API tests against a real MongoDB
shared/          types, universities, e-mail templates (used by server + client)
src/             React app (routes, components, hooks in src/lib)
scripts/         dev runner, Vercel build output, make-admin
```

## Features

| Area | What it does |
| --- | --- |
| Buyers | Browse/search/filter products and stores, cart, Buy Now, checkout (cash on delivery/pickup), order tracking, cancel while pending, wishlist, purchase-verified reviews, chat with the seller, order notifications (bell + `/notifications`) |
| Sellers | Register with university + student ID, store approval flow, products with photos, orders (forward-only status), earnings, reviews, messages, **e-mail for every new order** |
| Admins | `/admin`: approve / reject / unpublish stores, view seller identity (incl. private student ID photo), all orders per store, feature stores/products per university |

Business rules are enforced by the API, never the UI: prices come from the
database, one order per store inside a MongoDB transaction, you can't order from
your own store, order status only moves forward, only buyers of delivered orders
can review (once per product per order), sellers only touch their own store,
uploads must be in the uploader's own Cloudinary folder, and every mutating
request must come from the site's own origin.

## Setup (one time)

Step-by-step guide with exact screens: [docs/SETUP.md](docs/SETUP.md).

### 1. MongoDB Atlas (free)
1. Create an account at <https://www.mongodb.com/cloud/atlas>, create a free **M0** cluster.
2. *Database Access* → add a database user with a strong password.
3. *Network Access* → add `0.0.0.0/0` (Vercel functions use changing IPs).
4. *Connect → Drivers* → copy the connection string → this is `MONGODB_URI`.

### 2. Cloudinary (free)
Create an account at <https://cloudinary.com>, open *Dashboard → API Keys* and copy
the **API environment variable** (`cloudinary://KEY:SECRET@CLOUD`) → `CLOUDINARY_URL`.

### 3. Gmail sender (for order e-mails)
1. <https://console.cloud.google.com/> → new project → enable **Gmail API**.
2. *OAuth consent screen*: External, add yourself as test user, then **Publish app**
   (in "Testing" mode refresh tokens expire after 7 days).
3. *Credentials → OAuth client ID → Web application*, redirect URI
   `https://developers.google.com/oauthplayground`.
4. <https://developers.google.com/oauthplayground> → ⚙ *Use your own OAuth credentials* →
   authorise `https://www.googleapis.com/auth/gmail.send` → *Exchange authorization code* →
   copy the **refresh token**.

### 4. Vercel → Project → Settings → Environment Variables

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB` | `campuscart` (optional) |
| `BETTER_AUTH_SECRET` | optional — random 32+ chars; if unset it is derived from `MONGODB_URI` |
| `SITE_URL` | `https://campuscart-foundation.vercel.app` (already set) |
| `CLOUDINARY_URL` | from step 2 |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | from step 3 |
| `GMAIL_SENDER` | the Gmail address that authorised the token |
| `ADMIN_EMAILS` | your e-mail (comma-separated for several admins) |
| `CRON_SECRET` | optional — random 16+ chars; enables the daily e-mail retry job |
| `REQUIRE_EMAIL_VERIFICATION` | `true` to require confirmed e-mails (needs Gmail) |

Also remove any old Supabase integration from the Vercel project (*Settings →
Integrations / Storage*): a paused integration makes every deploy fail with
"Resource provisioning failed".

After deploying, open `/api/health` — it reports `db`, `cloudinary`, `gmail`,
`cron` and `admins` as configured / not configured (never the values).

### 5. First admin
Sign up on the site with an e-mail listed in `ADMIN_EMAILS`, confirm it (or set
`emailVerified: true` on your user in Atlas), then open `/admin` — the admin role
is granted automatically. Alternatively run locally:
`npm run make-admin -- you@example.com`.

## Seller order e-mails

Placing an order queues a message in `email_outbox` (inside the order
transaction) and sends it immediately via Gmail: order number, items, quantities,
prices, total, buyer name, phone, delivery address, note and a link to the order.
Vercel Cron (`/api/cron/order-emails`, daily on Hobby) retries anything that
failed. Sellers can turn the e-mails off or redirect them in **Seller Dashboard →
Settings**.

## Brand images

Put the logo files in `public/brand/`: `campuscart-logo.png`,
`campuscart-main-logo.png`, `diu.png`, `nsu.png`, `brac.png`, `du.jpg`, `ewu.jpg`.
Until then a text badge is shown in their place.

## Sample catalogue (development only)

Production shows only real listings. The old sample stores/products live in
`src/data/fixtures/sampleCatalog.ts` for tests and local design work; set
`VITE_SAMPLE_CATALOG=true` in `.env.local` to show them in `npm run dev`. They
are compiled out of production builds.

## Development

```sh
npm install
cp .env.example .env.local     # fill in MONGODB_URI etc.
npm run dev                    # API on :3001 + Vite on :5173 (proxies /api)
```

```sh
npm run typecheck
npm test                                   # unit tests
TEST_MONGODB_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" npm test   # + API tests (needs a replica set)
npm run build                              # dist/ + .vercel/output (static + api function)
```

A local replica set for tests: `docker run -d -p 27017:27017 mongo:8 --replSet rs0`
then `docker exec <id> mongosh --eval 'rs.initiate()'`.
