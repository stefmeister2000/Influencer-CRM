# Deploying to Railway

This app is a Next.js server + a **SQLite** database file. Railway containers have
an **ephemeral filesystem**, so the database must live on a **persistent volume**
or all accounts and data are wiped on every deploy.

## 1. Create the service

- New Project → Deploy from GitHub repo → pick `stefkeppens/Influencer-CRM`.
- Railway (Nixpacks) auto-detects Next.js:
  - Build: `npm ci && npm run build`
  - Start: `npm run start` (binds `0.0.0.0`, uses Railway's `$PORT`)
  - Node 22 is pinned via `engines` / `.nvmrc` (needed for the `better-sqlite3` prebuilt binary).

## 2. Add a volume (required)

- Service → **Variables/Settings → Volumes → New Volume**
- Mount path: `/data`

## 3. Set environment variables

| Variable | Value |
|---|---|
| `DATABASE_PATH` | `/data/orvion.db` |
| `AUTH_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | your Anthropic key (discovery + AI scoring/messages need it) |
| `ANTHROPIC_MODEL` | `claude-opus-4-8` (optional) |
| `DISCOVERY_PROVIDER` | `ai` |

Railway sets `PORT` automatically — do **not** set it yourself.

## 4. Deploy

First boot creates the schema and, on first sign-up, seeds the O'Learys team
(business profile + prompt library) into `/data/orvion.db`.

## Common failure causes

- **Data disappears after each deploy** → no volume, or `DATABASE_PATH` not pointing at it.
- **Build fails on `better-sqlite3` / node-gyp** → Node version mismatch. `.nvmrc` pins 22; make sure Railway isn't overriding it with a `NODE_VERSION` variable.
- **App boots then 500s on every page** → `/data` not writable, or `DATABASE_PATH` points at a directory that doesn't exist on the volume (use `/data/orvion.db`, not `/data`).
- **"redirect loop" / can't stay logged in** → `AUTH_SECRET` changing between deploys. Set it once as a variable.
