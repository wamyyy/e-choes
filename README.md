# CasaShoes — Deploy Guide (GitHub + Vercel)

This is a **static site** (plain HTML/CSS/JS) with a **Supabase** backend.
There is nothing to "build" — Vercel just serves these files directly, so
deployment is very simple.

## 1. What's in this folder (this is everything you need)

```
index.html            → the public store
admin.html             → the admin dashboard
admin-login.html       → admin login page
admin-manifest.json    → PWA manifest for the admin app
admin-sw.js            → service worker for the admin app
manifest.json          → PWA manifest for the main store
service-worker.js      → service worker for the main store
css/style.css          → all styles
js/                     → all site + admin logic (Supabase calls live here)
images/                 → product photos, icons
supabase-schema.sql     → run this once in your Supabase project (SQL Editor)
.env.example            → template only, NOT real secrets
.gitignore              → makes sure real .env files never get committed
vercel.json             → tells Vercel this is a static site + sets cache headers
```

Nothing else is required — no `package.json`, no build step, no `node_modules`.

## 2. Push it to GitHub

```bash
cd casashoes            # this folder
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

⚠️ Before pushing, double check you never commit a real `.env` file. This
project doesn't need one — the Supabase keys used in `js/supabase-client.js`
are the public **anon key** (safe to expose; it's protected by Row Level
Security policies in `supabase-schema.sql`, not by secrecy). Never add a
Supabase **service_role** key anywhere in this repo.

## 3. Deploy on Vercel

1. Go to https://vercel.com/new
2. Import the GitHub repo you just pushed.
3. Framework preset: choose **"Other"** (or leave it — Vercel will auto-detect
   a static site since there's no `package.json`/build script).
4. Root directory: leave as `/` (the repo root — this folder).
5. Build command: leave empty. Output directory: leave empty / `.`
6. Click **Deploy**.

That's it — no environment variables need to be set in Vercel, because the
Supabase URL/anon key are already inside `js/supabase-client.js` (they're
meant to be public).

## 4. One-time Supabase setup (if not done already)

In your Supabase project → **SQL Editor** → paste and run the contents of
`supabase-schema.sql`. This creates the `orders`, `order_items`, `profiles`,
etc. tables, sets up Row Level Security, and enables realtime updates on
`orders` (needed for the "admin confirms → customer sees it instantly"
feature).

To make your own account an admin, run in the SQL Editor:
```sql
SELECT public.promote_user_to_admin('your_email@example.com');
```
(You must sign up with that email first, either on the site or via
`admin-login.html`.)

## 5. After deploying

- Store: `https://<your-project>.vercel.app/`
- Admin dashboard: `https://<your-project>.vercel.app/admin-login.html`

If you connect a custom domain later, do it from the Vercel project
settings → Domains — no code changes needed.
