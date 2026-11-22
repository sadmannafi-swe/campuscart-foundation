# CampusCart — production setup

Never paste passwords, keys or connection strings into chats, issues or commits.
Enter them only on the provider's website or in Vercel.

## A. Disconnect the paused Supabase store (Vercel)

Removes only the link between the Vercel project and `supabase-almond-ocean`.

- **Do not** click *Delete store*, *Delete resource* or *Uninstall integration*.
- **Do not** touch the other Supabase project (`campuscode`) or the Lovable Cloud database.

1. vercel.com → team **Nafi's projects** → project **campuscart-foundation** → **Storage** tab.
2. On **supabase-almond-ocean** open **⋯** → **Disconnect** / **Remove from project** → confirm for `campuscart-foundation` only.
3. If it isn't listed there: team **Storage** page → **supabase-almond-ocean** → **Projects** → disconnect `campuscart-foundation`.

CLI alternative (from the project folder after `vercel login` and `vercel link`):

```bash
vercel storage disconnect supabase-almond-ocean --dry-run
vercel storage disconnect supabase-almond-ocean
```

Check: Settings → Environment Variables no longer lists `SUPABASE_*` / `POSTGRES_*`.

## B. MongoDB Atlas

1. cloud.mongodb.com → new Project "CampusCart" → **Create cluster** → **M0 Free**, AWS **N. Virginia (us-east-1)**, name `campuscart`.
2. **Database Access** → Add user `campuscart_app`, *Autogenerate Secure Password* (save it in a password manager), role **Read and write to any database**.
3. **Network Access** → Add IP → **Allow access from anywhere** (`0.0.0.0/0`).
4. Cluster → **Connect** → **Drivers** → Node.js → copy the `mongodb+srv://…` string and replace `<db_password>`. This is `MONGODB_URI`.

## C. Cloudinary

cloudinary.com → **Settings → API Keys** → copy the **API environment variable** and use only the part after
`CLOUDINARY_URL=` (`cloudinary://KEY:SECRET@CLOUD`).

## D. Gmail sender

1. console.cloud.google.com → new project → **Gmail API** → Enable.
2. **OAuth consent screen**: External, add yourself as test user, then **Publish app → In production**
   (in Testing mode the token expires after 7 days).
3. **Credentials → OAuth client ID → Web application**, redirect URI `https://developers.google.com/oauthplayground`.
4. developers.google.com/oauthplayground → ⚙ *Use your own OAuth credentials* → scope
   `https://www.googleapis.com/auth/gmail.send` → *Authorize APIs* (sign in as the sender) →
   *Exchange authorization code for tokens* → copy the **Refresh token**.

## E. Vercel environment variables (Settings → Environment Variables, mark secrets *Sensitive*)

| Name | Value | Production | Preview |
|---|---|---|---|
| `MONGODB_URI` | Atlas string | ✓ | ✓ |
| `MONGODB_DB` | `campuscart` | ✓ | |
| `MONGODB_DB` | `campuscart_preview` | | ✓ |
| `CLOUDINARY_URL` | Cloudinary | ✓ | ✓ |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Google | ✓ | ✓ |
| `GMAIL_SENDER` | sender Gmail address | ✓ | ✓ |
| `ADMIN_EMAILS` | your e-mail | ✓ | ✓ |
| `CRON_SECRET` | `openssl rand -base64 32` | ✓ | |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (optional) | ✓ | ✓ |
| `SITE_URL` | `https://campuscart-foundation.vercel.app` (already set) | ✓ | |

Previews automatically use their own URL for e-mail links. After deploying, open `/api/health`:
it reports `db`, `cloudinary`, `gmail`, `cron`, `admins` as configured or not (never values).

## F. Brand logos (`public/brand/`, exact names)

| File | Used for | Size |
|---|---|---|
| `campuscart-logo.png` | header logo | square ≥ 512 px, transparent |
| `campuscart-main-logo.png` | landing + seller home | square ≥ 512 px |
| `diu.png`, `nsu.png`, `brac.png` | campus cards | square ≥ 256 px |
| `du.jpg`, `ewu.jpg` | campus cards | square ≥ 256 px |

Missing files show a text badge instead of a broken image.
