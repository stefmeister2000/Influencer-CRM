# Deploying to Railway

Next.js server + a **SQLite** file (via Node's built-in `node:sqlite` — no native
modules, nothing to compile). Railway containers have an **ephemeral filesystem**,
so the database must live on a **persistent volume** or all accounts and data are
wiped on every deploy.

## 1. Create the service

- New Project → Deploy from GitHub repo → pick `stefmeister2000/Influencer-CRM`.
- Railway (Nixpacks) auto-detects Next.js:
  - Install: `npm ci`
  - Build: `npm run build`
  - Start: `npm run start` (binds `0.0.0.0`, uses Railway's `$PORT`)
- **Node 24** is pinned via `engines` + `.nvmrc` (`node:sqlite` runs unflagged on 24).
  Make sure Railway isn't overriding it with a `NODE_VERSION` variable.

## 2. Add a volume (required)

- Service → **Settings → Volumes → New Volume**
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

First boot creates the schema. The first sign-up creates the admin user and seeds
the O'Learys team (business profile + prompt library) into `/data/orvion.db`.
Every account and everything created after lives in that file on the volume.

## Common failure causes

- **Data / logins disappear after each deploy** → no volume, or `DATABASE_PATH`
  not set to a path *on* the volume. The app logs a warning at boot when
  `DATABASE_PATH` is unset in production.
- **App boots then 500s on every page** → `/data` not writable, or `DATABASE_PATH`
  points at a directory instead of a file (use `/data/orvion.db`, not `/data`).
- **Can't stay logged in / redirect loop** → `AUTH_SECRET` changing between
  deploys. Set it once as a variable.
- **Build fails: `node:sqlite` not found / needs `--experimental-sqlite`** →
  Node is older than 24. Check the resolved Node version in the build logs and
  that no `NODE_VERSION` var is forcing an older one.
