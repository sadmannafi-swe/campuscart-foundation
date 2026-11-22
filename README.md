# CampusCart

**Your Campus. Your Marketplace.** — a multi-campus student marketplace where
verified university students open stores and sell to students on their campus.
DIU (Daffodil International University) is live; NSU, BRAC, DU and EWU are
prepared as "coming soon" marketplaces.

Live: <https://campuscart-foundation.vercel.app/>

## Features

| Area | What it does |
| --- | --- |
| Buyers | Browse/search/filter products and stores, cart, Buy Now, checkout (cash on delivery/pickup), order tracking, cancel while pending, wishlist, purchase-verified reviews, chat with the seller, in-app notifications |
| Sellers | Register with university + student ID, store approval flow, product management with photos, order management (forward-only status), earnings, reviews, messages, **e-mail for every new order** |
| Admins | `/admin` (admin role required): approve / reject / unpublish stores, view seller identity, all orders per store, feature stores/products per university |

## Tech stack

TanStack Start (React 19, SSR, file routes in `src/routes`) · TanStack Query ·
Tailwind v4 + shadcn/Radix · Supabase (Postgres, Auth, Storage, RLS) ·
Vitest · deployed on Vercel (also editable in [Lovable](https://lovable.dev/projects/8b804af4-58bb-4d66-bfc7-7c32cec05ae6)).

Business rules live in the database, not the UI: `place_order`,
`update_order_status`, `cancel_my_order`, `submit_product_review`,
`get_product_reviews`, `open_product_chat`, `send_chat_message` are
`SECURITY DEFINER` functions, and every table has row-level security.

## Seller order e-mails (Gmail)

When a buyer places an order, a database trigger queues an e-mail in
`email_outbox` for that store's seller. The app sends it immediately after
checkout through the **Gmail API**, and a cron job retries anything that failed.
The e-mail contains the order number, items, quantities, prices, total, buyer
name, phone, delivery address, note and a link to the order in the dashboard.

Sellers control it in **Seller Dashboard → Settings → New order e-mails**
(on/off, and an optional different address; default is their account e-mail).

### One-time setup

1. **Google Cloud** (use the Gmail account that should send the mails):
   1. Create a project at <https://console.cloud.google.com/>, enable **Gmail API**.
   2. *OAuth consent screen*: External, add yourself as a test user, then
      **Publish app** (in "Testing" mode refresh tokens expire after 7 days).
   3. *Credentials → Create OAuth client ID → Web application*, add the redirect
      URI `https://developers.google.com/oauthplayground`.
2. **Refresh token**: open <https://developers.google.com/oauthplayground>, ⚙ →
   *Use your own OAuth credentials* (paste client ID/secret), authorise scope
   `https://www.googleapis.com/auth/gmail.send`, then *Exchange authorization
   code for tokens* and copy the **refresh token**.
3. **Vercel → Project → Settings → Environment Variables** (Production):

   | Variable | Value |
   | --- | --- |
   | `GMAIL_CLIENT_ID` | OAuth client ID |
   | `GMAIL_CLIENT_SECRET` | OAuth client secret |
   | `GMAIL_REFRESH_TOKEN` | refresh token from step 2 |
   | `GMAIL_SENDER` | the Gmail address that authorised the token |
   | `GMAIL_SENDER_NAME` | optional, default `CampusCart` |
   | `SITE_URL` | `https://campuscart-foundation.vercel.app` (links in e-mails) |
   | `CRON_SECRET` | random string, 16+ characters (Vercel Cron sends it automatically) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server only — never `VITE_`) |
   | `ADMIN_EMAILS` | comma-separated admin e-mails (see below) |

4. Redeploy. Until the Gmail variables exist, e-mails simply stay queued
   (nothing is lost; queued mails older than 3 days are not sent).

`vercel.json` schedules the retry sweep (`/api/cron/order-emails`) once a day,
which works on the Hobby plan; on Pro you can change it to e.g. `*/5 * * * *`.
Gmail's free sending limit is about 500 messages/day — plenty for a campus.

## Admin access

The console is at `/admin` (the old `/ccadmingo` link redirects there) and is
**no longer public**. Every admin server function checks the `admin` role.
To create the first admin, put your e-mail in `ADMIN_EMAILS`, sign up/log in
with that (confirmed) e-mail and open `/admin` — the role is granted
automatically. Alternatively run in the Supabase SQL editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = '<your e-mail>';
```

## Database migrations

Schema changes are in `supabase/migrations` (older) and `drizzle/migrations`
(newer, applied in `_journal.json` order). `0004_production_hardening_and_order_emails.sql`
must be applied to the Supabase project that production uses (Lovable applies
it when it syncs; otherwise paste it into the Supabase SQL editor). It adds:

- listings can only be created in the seller's own store; store/seller
  moderation fields (status, approval, name, category, university) are admin-only,
  and approved stores can now save description/contact edits;
- forward-only order status, `cancel_my_order` for buyers, no ordering from your own store;
- forged chat conversations and notification edits blocked;
- `email_outbox`, seller e-mail preferences, and the new-order e-mail trigger.

## Development

```sh
bun install    # or: npm install
bun run dev
bun run build
npx vitest run
npx tsc --noEmit
```

Client env (`.env`, public by design): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
Server secrets (service role, Gmail, cron) must only be set in the hosting
provider, never committed.

> This repository is connected to Lovable: don't force-push or rewrite pushed history.
