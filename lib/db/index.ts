import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

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
  "Hair loss","Men's health","Weight loss","Fitness coach","Personal trainer",
  "Gym owner","Barber","Hair salon","Beauty creator","Lifestyle creator",
  "Mom/women's wellness","Medical professional","Clinic","Pharmacy","Nutritionist",
  "Dietitian","Wellness page","Transformation page","Arabic creator","English creator",
  "UAE expat creator",
];

const DEFAULT_TEMPLATES: [string, string, string, string][] = [
  ["UAE hair loss affiliates","Find UAE-based creators for hair loss outreach. Mostly men. Barbers, grooming pages, gym guys, lifestyle pages, Arabic and English, 5k to 100k followers, not celebrities, good for affiliate outreach.","hair_loss","premium online doctor-reviewed hair loss treatment"],
  ["UAE men's health creators","Find UAE male lifestyle and wellness creators aligned with confidence and men's health. Dubai and Abu Dhabi, 5k-100k followers, clean premium look.","mens_health","discreet doctor-reviewed online men's health care"],
  ["Dubai barbers","Find Dubai barbers and men's grooming pages with engaged local audiences, 3k-80k followers.","hair_loss","men's confidence and hair support"],
  ["Abu Dhabi fitness coaches","Find Abu Dhabi fitness coaches and personal trainers focused on transformation, 5k-100k followers.","weight_loss","doctor-reviewed weight management partnership"],
  ["Arabic women's wellness creators","Find UAE Arabic-speaking women's wellness and lifestyle creators, family/health focus, 5k-100k followers.","wellness","modern discreet online care for wellness"],
  ["Weight loss transformation pages","Find UAE weight loss and body transformation pages with authentic engagement.","weight_loss","tracked referral weight management partnership"],
  ["Clinic owners","Find UAE aesthetic/wellness clinic owners and medical influencers open to partnerships.","mens_health","clinical partnership for online doctor-reviewed care"],
  ["Moms in the UAE","Find UAE-based mom and family creators (Dubai, Abu Dhabi, Sharjah) who share parenting, wellness, postpartum and everyday-life content. English and Arabic, 5k-100k followers, warm relatable tone, authentic engagement.","wellness","discreet doctor-reviewed online care for busy mums (women's wellness, weight, hair)"],
  ["Lifestyle influencers in the UAE","Find UAE lifestyle influencers covering daily life, fashion, food, fitness and routines. Dubai and Abu Dhabi, English and Arabic, 5k-100k followers, clean premium aesthetic, not celebrities.","wellness","premium modern doctor-reviewed online health & wellness"],
  ["Everyday UAE voices (normal people)","Find regular everyday people in the UAE who casually talk about their life, health, routines and opinions on camera — relatable micro-creators and UGC-style accounts, not polished influencers. English and Arabic, 1k-50k followers, authentic and trusted by their audience.","wellness","relatable, honest doctor-reviewed online care for everyday people"],
];

function open(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "orvion.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  runMigrations(db);
  return db;
}

/** Lightweight additive migrations for existing databases. */
function runMigrations(db: Database.Database) {
  ensureColumn(db, "content_scripts", "language", "text default 'en'");
  ensureColumn(db, "content_scripts", "format", "text default 'video'");
}

function ensureColumn(db: Database.Database, table: string, column: string, ddl: string) {
  const cols = db.prepare(`pragma table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`alter table ${table} add column ${column} ${ddl}`);
  }
}

// Singleton across Next.js hot reloads.
const g = globalThis as unknown as { __orvionDb?: Database.Database };
export const db: Database.Database = g.__orvionDb ?? (g.__orvionDb = open());

export const uid = () => randomUUID();
export const nowIso = () => new Date().toISOString();

/** Seed default categories + prompt templates for a newly created team. */
export function seedTeam(teamId: string) {
  const cat = db.prepare(
    "insert into categories (id, team_id, name, slug, is_default, created_at) values (?,?,?,?,1,?)",
  );
  const insertCats = db.transaction(() => {
    for (const name of DEFAULT_CATEGORIES) {
      cat.run(uid(), teamId, name, slugify(name), nowIso());
    }
  });
  insertCats();

  const tpl = db.prepare(
    `insert into prompt_templates
     (id, team_id, name, prompt, default_product, default_message_angle, created_at, updated_at)
     values (?,?,?,?,?,?,?,?)`,
  );
  const insertTpls = db.transaction(() => {
    for (const [name, prompt, product, angle] of DEFAULT_TEMPLATES) {
      tpl.run(uid(), teamId, name, prompt, product, angle, nowIso(), nowIso());
    }
  });
  insertTpls();
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
