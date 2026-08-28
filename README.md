# ORVION — Influencer Discovery, Outreach & CRM Platform

A compliant, production-grade internal platform to **discover, categorize, score, and reach out** to Instagram creators for ORVION (premium online doctor-reviewed health platform, UAE).

> **Compliance first.** This is *not* a scraper or a mass-DM bot. Discovery happens through official APIs (Instagram Graph API / Business Discovery), approved data providers, manual add, and CSV import. Every outbound message passes through a **human review + send queue**. No fake accounts, no login bypass, no rate-limit evasion, no uncontrolled auto-DMs.

---

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Next.js 14 (App Router)                       │
│                                                                        │
│  Client Components            Server Components / Server Actions       │
│  - dashboard table            - data fetching (RLS-scoped)             │
│  - filters / drawers          - mutations via services                 │
│  - kanban / forms             - AI orchestration                       │
└───────────────┬───────────────────────────────┬──────────────────────┘
                │                                 │
                │ supabase-js (RLS)               │ service layer
                ▼                                 ▼
        ┌───────────────┐              ┌─────────────────────────────┐
        │   Supabase    │              │      lib/services/*         │
        │  - Postgres   │              │  campaign, influencer,      │
        │  - Auth       │◄─────────────┤  discovery, import, export, │
        │  - Storage    │              │  duplicate, affiliate, audit│
        │  - RLS        │              └──────────────┬──────────────┘
        └───────────────┘                             │
                                                       ▼
                              ┌──────────────────────────────────────┐
                              │            lib/ai/*                   │
                              │  promptParser · scoring · message     │
                              │  generator · compliance · quality     │
                              │       (Anthropic Claude API)          │
                              └──────────────────────────────────────┘
                                                       │
                              ┌──────────────────────────────────────┐
                              │       lib/providers/* (data)          │
                              │  ProfileProvider interface:           │
                              │  searchProfiles · enrichProfile ·     │
                              │  fetchRecentPosts · fetchBasicMetrics │
                              │  - InstagramGraphProvider (placeholder)│
                              │  - ManualProvider / CsvProvider       │
                              └──────────────────────────────────────┘
                                                       │
                              ┌──────────────────────────────────────┐
                              │   Optional queue (V2): enrichment,    │
                              │   scoring batches, follow-up timers   │
                              │   (Supabase cron / pg_cron / external)│
                              └──────────────────────────────────────┘
```

**Layering rules**
- **UI** never talks to Claude or providers directly — only via **server actions → services**.
- **Services** own all DB access and orchestration; they are the only place that knows about both AI and providers.
- **AI modules** are pure: input data in, structured output out. No DB side effects.
- **Providers** implement one interface (`ProfileProvider`) so we can swap manual/CSV/Graph API freely.
- **RLS** is the real security boundary — server actions still pass the user's session.

---

## 2. Tech stack

| Concern        | Choice                                            |
|----------------|---------------------------------------------------|
| Framework      | Next.js 14 (App Router, RSC, Server Actions)      |
| Language       | TypeScript (strict)                               |
| Styling        | Tailwind CSS + small design-token layer           |
| DB / Auth      | Supabase (Postgres + Auth + Storage + RLS)        |
| AI             | Anthropic Claude API (`claude-opus-4-8` / sonnet) |
| Validation     | Zod                                               |
| Tables/forms   | Server components + light client islands          |
| Queue (V2)     | pg_cron / Supabase Edge Functions / external      |

---

## 3. Database schema (overview)

Full SQL lives in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Tables:

`profiles` (app users + role) · `teams` · `team_members` · `campaigns` · `influencers` · `categories` · `influencer_categories` · `tags` · `influencer_tags` · `messages` · `outreach_events` · `notes` · `imports` · `prompt_templates` · `affiliate_partners` · `audit_logs` · `settings`.

Every domain table has: `id uuid`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` (soft delete), `team_id` (RLS scope). Enums model the status machines. RLS policies enforce role + team. Trigram + btree indexes on search-heavy columns.

---

## 4. File / folder structure

```
.
├─ app/
│  ├─ (auth)/login/page.tsx
│  ├─ (dashboard)/
│  │  ├─ layout.tsx                # sidebar + topbar shell
│  │  ├─ dashboard/page.tsx        # metrics overview
│  │  ├─ campaigns/page.tsx
│  │  ├─ campaigns/new/page.tsx
│  │  ├─ influencers/page.tsx      # table + filters
│  │  ├─ influencers/[id]/page.tsx # detail
│  │  ├─ discovery/page.tsx        # prompt → filters → campaign
│  │  ├─ review/page.tsx           # review queue
│  │  ├─ send-queue/page.tsx
│  │  ├─ pipeline/page.tsx         # kanban (V2)
│  │  ├─ affiliates/page.tsx       # (V2)
│  │  ├─ templates/page.tsx        # prompt library
│  │  └─ settings/page.tsx
│  ├─ actions/                     # server actions (thin → services)
│  ├─ layout.tsx
│  ├─ page.tsx                     # → /dashboard or /login
│  └─ globals.css
├─ components/                     # UI primitives + feature components
├─ lib/
│  ├─ supabase/{client,server,middleware}.ts
│  ├─ ai/{anthropic,promptParser,scoring,messageGenerator,compliance,quality}.ts
│  ├─ providers/{types,manual,csv,instagramGraph}.ts
│  ├─ services/*.ts
│  ├─ scoring/ruleBased.ts
│  ├─ csv.ts · types.ts · constants.ts · utils.ts · permissions.ts
├─ supabase/migrations/0001_init.sql
├─ supabase/seed.sql
├─ middleware.ts
└─ config files
```

---

## 5. Core user flows

**A. Prompt-based discovery (the headline flow)**
1. User writes natural-language prompt on `/discovery`.
2. `aiPromptParser` → structured filter JSON (country, cities, niches, follower range, languages, exclusions, message angle…).
3. User reviews/edits filters → creates a **campaign**.
4. `discoveryService` calls the active `ProfileProvider` (manual/CSV/Graph) → normalized profiles.
5. `duplicateDetectionService` dedupes by username/url/email/phone.
6. `aiScoring` categorizes + scores each (rule-based blend + AI) and produces a contact recommendation.
7. Profiles land in the **review queue** (`needs_review`).
8. Human approves/rejects.
9. `messageGenerator` writes a personalized, compliance-checked message per approved profile.
10. Human edits/approves → **send queue**.
11. Human marks sent (or future approved integration sends).
12. Track replies → interested → onboarded affiliate.

**B. Manual add / CSV import** → same review → score → message pipeline.

**C. CRM lifecycle**: status + outreach_status + affiliate_status state machines, every change written to `outreach_events` (activity timeline) and `audit_logs`.

---

## 6. UI pages
Dashboard overview · Campaigns · Influencers (table+filters+drawer) · Discovery · Review queue · Send queue · Kanban pipeline · Affiliates · Prompt templates · Imports/Exports · Settings.

Design: clean SaaS, white bg, light-blue accents, card surfaces, sticky bulk-action bar, slide-over profile drawer, score/status badges.

---

## 7. Implementation plan (phased)

**MVP (this scaffold):** auth + roles · campaigns · manual add · CSV import · influencer list + filters · detail page · AI parse/score/message · approve/reject/delete · send queue · status tracking · notes · CSV export.

**V2:** Graph API provider · enrichment queue · kanban · affiliate tracking · bulk actions · analytics · prompt template library.

**V3:** reply tracking · email/WhatsApp (compliant) · approved IG messaging · revenue attribution · automated follow-up suggestions (human-approved).

---

## 8. Setup (local, single-user)

No external services, no native modules. The database is a SQLite file (via Node's
built-in `node:sqlite`) created automatically at `./data/orvion.db`. **Requires
Node 24+.**

```bash
npm install
cp .env.example .env.local        # optional: add ANTHROPIC_API_KEY + set AUTH_SECRET
npm run dev                        # http://localhost:3000
```

Open the app → **Create account** (first account becomes admin; a team + default
categories/prompt templates are seeded automatically). The app runs without an
Anthropic key — scoring and messages then use the built-in rule-based/template
fallbacks. Add `ANTHROPIC_API_KEY` to enable the AI features.

**Deploying (Railway/Fly/etc.):** set `DATABASE_PATH` to a file on a persistent
volume — see [`DEPLOY.md`](DEPLOY.md).

> **Note:** the original Supabase/Postgres design is described in sections 1–3
> above for reference; the running implementation uses local SQLite
> (`lib/db/index.ts`) + a signed-cookie session (`lib/auth.ts`) so it needs zero
> cloud setup. Swapping back to Postgres later means re-pointing the service
> layer — the AI, providers, and UI are unchanged.
