import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Loose surface over node:sqlite that mirrors the (permissive) better-sqlite3
 * ergonomics this codebase was written against: statements take `any` params and
 * return `any`, so callers keep doing `... as SomeType`. Runtime behaviour is
 * exactly node:sqlite's.
 */
interface Stmt {
  all(...params: any[]): any[];
  get(...params: any[]): any;
  run(...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}
interface DB {
  prepare(sql: string): Stmt;
  exec(sql: string): void;
  close(): void;
}

/**
 * node:sqlite builds every row (and .run() result) with Object.create(null) —
 * a null-prototype object. React Server Components' flight serializer rejects
 * those when a Server Component passes one to a Client Component
 * ("Only plain objects... Classes or null prototypes are not supported"),
 * which crashed any page handing a raw db row to a "use client" component
 * (e.g. Settings -> RoleManager). Normalize once here so every caller gets a
 * plain object for free.
 */
function toPlain<T>(row: T): T {
  return row && typeof row === "object" ? ({ ...row } as T) : row;
}

// --- Schema (SQLite). Enums modeled as TEXT; jsonb as TEXT; bools as 0/1. ---
const SCHEMA = `
create table if not exists teams (
  id text primary key, name text not null,
  created_at text not null, updated_at text not null
);

create table if not exists users (
  id text primary key,
  team_id text not null references teams(id),
  email text not null unique,
  full_name text,
  role text not null default 'admin',
  password_hash text not null,
  created_at text not null, updated_at text not null
);

create table if not exists campaigns (
  id text primary key,
  team_id text not null references teams(id),
  name text not null,
  country text, city text, target_category text, product_focus text,
  search_prompt text, parsed_filters text, brand_voice text, outreach_goal text,
  affiliate_payout integer,
  status text not null default 'draft',
  created_by text, updated_by text,
  created_at text not null, updated_at text not null, deleted_at text
);

create table if not exists influencers (
  id text primary key,
  team_id text not null references teams(id),
  campaign_id text references campaigns(id),
  instagram_username text not null,
  platform text not null default 'instagram',   -- instagram | tiktok
  profile_url text, full_name text, bio text, profile_picture_url text,
  follower_count integer, following_count integer, post_count integer,
  avg_likes real, avg_comments real, engagement_rate real,
  country text, city text, language text, email text, whatsapp text, website text,
  category text, subcategory text, gender_focus text, audience_type text,
  estimated_audience_country text,
  product_fit text,
  brand_fit_score integer, engagement_score integer, quality_score integer,
  risk_score integer, final_score integer,
  status text not null default 'new',
  outreach_status text not null default 'not_ready',
  affiliate_status text not null default 'not_affiliate',
  ai_recommendation text, ai_reasoning text, best_product_angle text,
  best_message_style text, risk_warning text,
  notes text, source text not null default 'manual',
  created_by text, updated_by text,
  created_at text not null, updated_at text not null, deleted_at text
);
create index if not exists idx_inf_team on influencers(team_id);
create index if not exists idx_inf_status on influencers(team_id, status);
create index if not exists idx_inf_score on influencers(team_id, final_score);

create table if not exists categories (
  id text primary key, team_id text not null, name text not null, slug text not null,
  color text default '#e0f2fe', is_default integer default 0, created_at text not null
);
create table if not exists tags (
  id text primary key, team_id text not null, name text not null,
  color text default '#f1f5f9', created_at text not null
);
create table if not exists influencer_categories (
  influencer_id text not null, category_id text not null,
  primary key (influencer_id, category_id)
);
create table if not exists influencer_tags (
  influencer_id text not null, tag_id text not null,
  primary key (influencer_id, tag_id)
);

create table if not exists messages (
  id text primary key,
  team_id text not null, influencer_id text not null, campaign_id text,
  kind text not null default 'friendly', language text default 'English',
  channel text default 'instagram_dm', body text not null,
  state text not null default 'generated',
  compliance_passed integer, compliance_notes text,
  edited_by_human integer not null default 0,
  created_by text, updated_by text,
  created_at text not null, updated_at text not null, sent_at text, deleted_at text
);
create index if not exists idx_msg_inf on messages(influencer_id);
create index if not exists idx_msg_state on messages(team_id, state);

create table if not exists outreach_events (
  id text primary key, team_id text not null, influencer_id text not null,
  type text not null, detail text, metadata text, actor_id text, created_at text not null
);
create index if not exists idx_evt_inf on outreach_events(influencer_id, created_at);

create table if not exists notes (
  id text primary key, team_id text not null, influencer_id text not null,
  body text not null, created_by text, created_at text not null, deleted_at text
);

create table if not exists imports (
  id text primary key, team_id text not null, campaign_id text, filename text,
  total_rows integer default 0, inserted integer default 0, updated integer default 0,
  skipped integer default 0, errors text, created_by text, created_at text not null
);

create table if not exists prompt_templates (
  id text primary key, team_id text not null, name text not null, prompt text not null,
  default_country text, default_product text, default_message_angle text,
  default_filters text, created_by text,
  created_at text not null, updated_at text not null, deleted_at text
);

create table if not exists affiliate_partners (
  id text primary key, team_id text not null, influencer_id text,
  affiliate_name text, affiliate_email text, affiliate_phone text,
  referral_code text, tracking_link text, commission_amount integer, payout_method text,
  signed_date text, status text not null default 'invited',
  total_leads integer default 0, total_confirmed_patients integer default 0,
  total_payout_due real default 0, last_payout_date text,
  created_by text, updated_by text,
  created_at text not null, updated_at text not null, deleted_at text
);

create table if not exists audit_logs (
  id text primary key, team_id text, actor_id text, action text not null,
  entity text not null, entity_id text, before text, after text, created_at text not null
);

create table if not exists settings (
  team_id text not null, key text not null, value text not null, updated_at text not null,
  primary key (team_id, key)
);

create table if not exists content_scripts (
  id text primary key,
  team_id text not null references teams(id),
  category text not null,
  brief text,
  body text not null,
  status text not null default 'draft',     -- draft | in_progress | video_made
  used_web_search integer default 0,
  created_by text, updated_by text,
  created_at text not null, updated_at text not null, deleted_at text
);
create index if not exists idx_scripts_team on content_scripts(team_id, status);
`;

const DEFAULT_CATEGORIES = [
  "Food & restaurant creator","Foodie / where to eat","Bar & nightlife","Beer & craft beer",
  "Cocktails & drinks","Sports fan / football","Student life","Lifestyle creator",
  "Family & things to do","Events & going out","Ghent creator","Hasselt / Limburg creator",
  "Netherlands creator","Dutch-language creator","Comedy / entertainment","UGC / micro creator",
  "Travel & city guide","Group & birthday hosting",
];

/**
 * Default business profile for a new team — this instance is set up for O'Learys
 * (sports bar & restaurant; Ghent & Hasselt in Belgium, plus the Netherlands).
 * Editable any time in Settings → Business profile.
 */
const OLEARYS_BUSINESS = {
  name: "O'Learys",
  website: "https://olearys.be",
  instagram: "",
  description:
    "O'Learys is an American (Boston-themed) sports bar & restaurant: burgers, ribs, wings and sharing plates, cocktails and beer, live sport on big screens, arcade games and events, plus group bookings, birthdays, team nights and student deals. Venues in Ghent and Hasselt (Belgium) and across the Netherlands. Audience: students and young adults 18-35, sports fans, groups of friends, families and after-work crowds who go out to eat, drink and watch the game.",
  location: "Ghent & Hasselt (Belgium) and the Netherlands",
  offer:
    "Creator partnership: a hosted visit for you + guests (food & drinks covered), event and match-night invites, and paid collaborations or an affiliate deal on bookings — in exchange for a Reel/TikTok + Stories.",
  voice:
    "Fun, energetic, sporty and welcoming. Casual and local — Dutch/Flemish first for Belgium, Dutch for the Netherlands, English where it fits. Never stiff or corporate.",
};

// name, prompt, product (short label), outreach angle — all O'Learys / Ghent-Hasselt-NL, IG + TikTok.
const DEFAULT_TEMPLATES: [string, string, string, string][] = [
  ["Ghent food & foodie creators","Find Ghent-based food, restaurant and 'where to eat' creators on Instagram and TikTok who review spots, do food tours and post what's new in the city. 2k-60k followers, authentic local engagement, not celebrities.","hosted tasting + paid collab","invite them for a hosted tasting at O'Learys Ghent and a Reel/TikTok"],
  ["Hasselt & Limburg lifestyle","Find Hasselt and Limburg lifestyle, food and going-out creators on Instagram and TikTok who post about local bars, restaurants and events. 2k-50k followers, strong regional audience.","hosted visit + event invites","host them at O'Learys Hasselt for a match night or dinner"],
  ["Netherlands food & nightlife","Find Dutch food, horeca and nightlife creators on TikTok and Instagram (Randstad and student cities) covering restaurants, bars and student life. 5k-100k followers, Dutch-language, real engagement.","paid collab + booking affiliate","partner for a visit to an O'Learys NL venue plus TikTok content"],
  ["Student creators (Ghent)","Find student creators and study-life accounts in Ghent on TikTok and Instagram — student deals, nights out, campus life. 1k-40k followers, trusted by a local student audience.","student night promo + free entry/food","get them to a student night at O'Learys Ghent"],
  ["Sports & football fans","Find Belgian and Dutch football and sports fan creators and watch-party accounts on Instagram and TikTok who post match reactions and where-to-watch content. 3k-80k followers.","match-night hosting + collab","make O'Learys their go-to spot to watch the game"],
  ["Families & things to do","Find family, parenting and 'things to do with kids' creators in East/West Flanders, Limburg and the Netherlands on Instagram and TikTok. 3k-60k followers, warm local tone.","hosted family visit","invite them for a family meal and games at O'Learys"],
  ["Beer, cocktails & bar culture","Find craft beer, cocktail and bar-culture creators in Belgium and the Netherlands on Instagram and TikTok. 2k-50k followers, authentic taste-focused content.","hosted tasting + collab","a drinks-focused visit and content collab"],
  ["Micro & UGC everyday voices","Find relatable micro-creators and UGC-style accounts in Ghent, Hasselt and the Netherlands on TikTok and Instagram who casually vlog daily life, food and nights out. 500-20k followers, high trust with their audience.","hosted visit + gifted","an authentic, low-key visit and honest post"],
];

/**
 * Where the SQLite file lives.
 * - Local dev: ./data/orvion.db (default).
 * - Hosted (Railway/Fly/etc.): the container filesystem is EPHEMERAL, so point
 *   DATABASE_PATH at a mounted persistent volume, e.g. /data/orvion.db, or every
 *   deploy wipes all accounts and data.
 */
function dbFilePath(): string {
  const fromEnv = process.env.DATABASE_PATH?.trim();
  return fromEnv && fromEnv.length > 0
    ? path.resolve(fromEnv)
    : path.join(process.cwd(), "data", "orvion.db");
}

function open(): DB {
  const file = dbFilePath();
  const dir = path.dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_PATH?.trim()) {
    console.warn(
      "[db] DATABASE_PATH is not set — the SQLite file is on the container's " +
      "ephemeral disk. Accounts and data will be LOST on every deploy/restart. " +
      "Mount a persistent volume and set DATABASE_PATH (see DEPLOY.md).",
    );
  }

  const raw = new DatabaseSync(file);
  const rawDb = raw as unknown as DB;

  // Wrap every prepared statement so all()/get()/run() hand back plain objects
  // instead of node:sqlite's null-prototype ones (see toPlain() above).
  const db: DB = {
    prepare(sql: string): Stmt {
      const stmt = rawDb.prepare(sql);
      return {
        all: (...params: any[]) => stmt.all(...params).map(toPlain),
        get: (...params: any[]) => toPlain(stmt.get(...params)),
        run: (...params: any[]) => toPlain(stmt.run(...params)),
      };
    },
    exec: (sql: string) => rawDb.exec(sql),
    close: () => rawDb.close(),
  };

  // node:sqlite defaults busy_timeout to 0 (fail immediately on a locked db).
  // `next build` opens the file from several worker processes at once, so give
  // writers time to wait it out. These calls can themselves race with another
  // process's BEGIN IMMEDIATE, so retry them the same way as schema init.
  withRetry(() => db.exec("PRAGMA busy_timeout = 20000"));
  withRetry(() => db.exec("PRAGMA journal_mode = WAL"));
  withRetry(() => db.exec("PRAGMA foreign_keys = ON"));

  // `next build` (and multiple server instances) can open this same file from
  // several processes at once. BEGIN IMMEDIATE takes the write lock up front, so
  // a second process's schema/migration pass blocks (via busy_timeout) until the
  // first one commits, instead of racing the "does this column exist yet" check.
  // Even with busy_timeout, heavy build-time contention can still surface a
  // "database is locked" — retry the whole pass a few times with backoff.
  initSchema(db);
  return db;
}

function withRetry<T>(fn: () => T, attempt = 0): T {
  try {
    return fn();
  } catch (err: any) {
    if (attempt < 10 && /database is locked|SQLITE_BUSY/i.test(String(err?.message))) {
      sleepSync(200 * Math.pow(1.5, attempt));
      return withRetry(fn, attempt + 1);
    }
    throw err;
  }
}

function initSchema(db: DB): void {
  withRetry(() => {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(SCHEMA);
      runMigrations(db);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  });
}

/** Synchronous sleep — module init can't be async, and this only runs a handful of times. */
function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Lightweight additive migrations for existing databases. */
function runMigrations(db: DB) {
  ensureColumn(db, "content_scripts", "language", "text default 'en'");
  ensureColumn(db, "content_scripts", "format", "text default 'video'");
  // Instagram + TikTok: which platform a creator's handle belongs to.
  ensureColumn(db, "influencers", "platform", "text default 'instagram'");
}

function ensureColumn(db: DB, table: string, column: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (cols.some((c) => c.name === column)) return;
  try {
    db.exec(`alter table ${table} add column ${column} ${ddl}`);
  } catch (err: any) {
    // Belt-and-suspenders: another process won this race despite the transaction above.
    if (!/duplicate column name/i.test(String(err?.message))) throw err;
  }
}

/**
 * Run `fn` inside a transaction (node:sqlite has no `.transaction()` helper).
 * Commits on success, rolls back and rethrows on error.
 */
export function tx<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// Singleton across Next.js hot reloads.
const g = globalThis as unknown as { __orvionDb?: DB };
export const db: DB = g.__orvionDb ?? (g.__orvionDb = open());

export const uid = () => randomUUID();
export const nowIso = () => new Date().toISOString();

/**
 * Seed a newly created team: default categories, the O'Learys business profile,
 * and an O'Learys-focused prompt library (Ghent / Hasselt / Netherlands,
 * Instagram + TikTok). Everything is editable later in Settings / Prompt library.
 */
export function seedTeam(teamId: string) {
  const cat = db.prepare(
    "insert into categories (id, team_id, name, slug, is_default, created_at) values (?,?,?,?,1,?)",
  );
  const setting = db.prepare(
    "insert or replace into settings (team_id, key, value, updated_at) values (?,?,?,?)",
  );
  const tpl = db.prepare(
    `insert into prompt_templates
     (id, team_id, name, prompt, default_product, default_message_angle, created_at, updated_at)
     values (?,?,?,?,?,?,?,?)`,
  );
  tx(() => {
    for (const name of DEFAULT_CATEGORIES) {
      cat.run(uid(), teamId, name, slugify(name), nowIso());
    }
    setting.run(teamId, "business_profile", JSON.stringify(OLEARYS_BUSINESS), nowIso());
    for (const [name, prompt, product, angle] of DEFAULT_TEMPLATES) {
      tpl.run(uid(), teamId, name, prompt, product, angle, nowIso(), nowIso());
    }
  });
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// --- Generic helpers -------------------------------------------------------

/** Insert a row from an object; returns the inserted id. */
export function insertRow(table: string, obj: Record<string, unknown>): string {
  const cols = Object.keys(obj);
  const placeholders = cols.map(() => "?").join(", ");
  db.prepare(`insert into ${table} (${cols.join(", ")}) values (${placeholders})`)
    .run(...cols.map((c) => normalize(obj[c])));
  return String(obj.id ?? "");
}

/** Update a row by id (+team scope); ignores undefined fields. */
export function updateRow(
  table: string, id: string, teamId: string, patch: Record<string, unknown>,
) {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (!entries.length) return;
  const set = entries.map(([k]) => `${k} = ?`).join(", ");
  db.prepare(`update ${table} set ${set} where id = ? and team_id = ?`)
    .run(...entries.map(([, v]) => normalize(v)), id, teamId);
}

/** Convert JS values to SQLite-storable primitives. */
function normalize(v: unknown): string | number | null | bigint | Buffer {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "object") return JSON.stringify(v);
  return v as string | number;
}
