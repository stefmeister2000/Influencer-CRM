-- =============================================================================
-- ORVION Influencer CRM — initial schema
-- Postgres / Supabase. Run in the Supabase SQL editor (or via CLI migration).
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";     -- trigram search

-- -----------------------------------------------------------------------------
-- ENUMS (status machines)
-- -----------------------------------------------------------------------------
create type user_role as enum ('admin', 'sales_manager', 'outreach_assistant', 'viewer');

create type campaign_status as enum ('draft', 'active', 'paused', 'completed');

create type influencer_status as enum (
  'new','needs_review','approved','rejected','contacted','responded',
  'interested','negotiating','onboarded','not_interested','deleted'
);

create type outreach_status as enum (
  'not_ready','message_generated','approved_to_send','sent','replied',
  'follow_up_needed','closed'
);

create type affiliate_status as enum ('not_affiliate','invited','signed_up','active','inactive');

create type message_kind as enum (
  'friendly','premium','direct','less_salesy','arabic','english','short_dm',
  'long_email','whatsapp','follow_up_1','follow_up_2','thank_you',
  'rejection_reply','negotiation_reply'
);

create type message_state as enum (
  'generated','approved_to_send','do_not_send','needs_edit','sent','replied','follow_up_needed'
);

create type source_kind as enum ('manual','csv','instagram_graph','provider');

create type event_type as enum (
  'profile_added','message_generated','message_edited','approved_for_outreach',
  'marked_sent','reply_received','note_added','status_changed','affiliate_link_sent',
  'onboarded','rejected','deleted','restored','imported','scored'
);

-- -----------------------------------------------------------------------------
-- CORE: teams + users
-- -----------------------------------------------------------------------------
create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- profiles mirrors auth.users 1:1 and holds app role + team
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  team_id     uuid references teams(id) on delete set null,
  email       text not null,
  full_name   text,
  role        user_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- CAMPAIGNS
-- -----------------------------------------------------------------------------
create table campaigns (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references teams(id) on delete cascade,
  name            text not null,
  country         text,
  city            text,
  target_category text,
  product_focus   text,          -- hair_loss | mens_health | weight_loss | wellness | ...
  search_prompt   text,
  parsed_filters  jsonb,         -- structured filter JSON from aiPromptParser
  brand_voice     text,
  outreach_goal   text,
  affiliate_payout integer,      -- AED per confirmed patient
  status          campaign_status not null default 'draft',
  created_by      uuid references profiles(id),
  updated_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- -----------------------------------------------------------------------------
-- INFLUENCERS
-- -----------------------------------------------------------------------------
create table influencers (
  id                          uuid primary key default gen_random_uuid(),
  team_id                     uuid not null references teams(id) on delete cascade,
  campaign_id                 uuid references campaigns(id) on delete set null,

  instagram_username          text not null,
  profile_url                 text,
  full_name                   text,
  bio                         text,
  profile_picture_url         text,

  follower_count              integer,
  following_count             integer,
  post_count                  integer,
  avg_likes                   numeric,
  avg_comments                numeric,
  engagement_rate             numeric,   -- percent, e.g. 3.40

  country                     text,
  city                        text,
  language                    text,
  email                       text,
  whatsapp                    text,
  website                     text,

  category                    text,      -- primary category (also see join table)
  subcategory                 text,
  gender_focus                text,
  audience_type               text,
  estimated_audience_country  text,

  product_fit                 text,
  brand_fit_score             integer,   -- 0..100
  engagement_score            integer,
  quality_score               integer,
  risk_score                  integer,   -- higher = riskier
  final_score                 integer,

  status                      influencer_status not null default 'new',
  outreach_status             outreach_status not null default 'not_ready',
  affiliate_status            affiliate_status not null default 'not_affiliate',

  ai_recommendation           text,      -- yes | no | maybe
  ai_reasoning                text,
  best_product_angle          text,
  best_message_style          text,
  risk_warning                text,

  notes                       text,
  source                      source_kind not null default 'manual',

  created_by                  uuid references profiles(id),
  updated_by                  uuid references profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  deleted_at                  timestamptz
);

-- Dedup helpers: case-insensitive uniqueness per team on username (when live)
create unique index influencers_team_username_uq
  on influencers (team_id, lower(instagram_username))
  where deleted_at is null;

create index influencers_team_idx        on influencers (team_id);
create index influencers_status_idx      on influencers (team_id, status);
create index influencers_outreach_idx    on influencers (team_id, outreach_status);
create index influencers_campaign_idx    on influencers (campaign_id);
create index influencers_score_idx       on influencers (team_id, final_score desc);
create index influencers_email_idx       on influencers (team_id, lower(email));
create index influencers_username_trgm   on influencers using gin (instagram_username gin_trgm_ops);
create index influencers_fullname_trgm   on influencers using gin (coalesce(full_name,'') gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- CATEGORIES + TAGS (many-to-many)
-- -----------------------------------------------------------------------------
create table categories (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  name        text not null,
  slug        text not null,
  color       text default '#e0f2fe',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (team_id, slug)
);

create table influencer_categories (
  influencer_id uuid not null references influencers(id) on delete cascade,
  category_id   uuid not null references categories(id) on delete cascade,
  primary key (influencer_id, category_id)
);

create table tags (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  name        text not null,
  color       text default '#f1f5f9',
  created_at  timestamptz not null default now(),
  unique (team_id, name)
);

create table influencer_tags (
  influencer_id uuid not null references influencers(id) on delete cascade,
  tag_id        uuid not null references tags(id) on delete cascade,
  primary key (influencer_id, tag_id)
);

-- -----------------------------------------------------------------------------
-- MESSAGES (outreach drafts)
-- -----------------------------------------------------------------------------
create table messages (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  influencer_id uuid not null references influencers(id) on delete cascade,
  campaign_id   uuid references campaigns(id) on delete set null,
  kind          message_kind not null default 'friendly',
  language      text default 'English',
  channel       text default 'instagram_dm',   -- instagram_dm | email | whatsapp
  body          text not null,
  state         message_state not null default 'generated',
  compliance_passed boolean,
  compliance_notes  text,
  edited_by_human   boolean not null default false,
  created_by    uuid references profiles(id),
  updated_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  sent_at       timestamptz,
  deleted_at    timestamptz
);
create index messages_influencer_idx on messages (influencer_id);
create index messages_state_idx      on messages (team_id, state);

-- -----------------------------------------------------------------------------
-- OUTREACH EVENTS (activity timeline)
-- -----------------------------------------------------------------------------
create table outreach_events (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  influencer_id uuid not null references influencers(id) on delete cascade,
  type          event_type not null,
  detail        text,
  metadata      jsonb,
  actor_id      uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index outreach_events_influencer_idx on outreach_events (influencer_id, created_at desc);

-- -----------------------------------------------------------------------------
-- NOTES
-- -----------------------------------------------------------------------------
create table notes (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  influencer_id uuid not null references influencers(id) on delete cascade,
  body          text not null,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index notes_influencer_idx on notes (influencer_id, created_at desc);

-- -----------------------------------------------------------------------------
-- IMPORTS (CSV batches)
-- -----------------------------------------------------------------------------
create table imports (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  campaign_id   uuid references campaigns(id) on delete set null,
  filename      text,
  total_rows    integer default 0,
  inserted      integer default 0,
  updated       integer default 0,
  skipped       integer default 0,
  errors        jsonb,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- PROMPT TEMPLATES (search library)
-- -----------------------------------------------------------------------------
create table prompt_templates (
  id                    uuid primary key default gen_random_uuid(),
  team_id               uuid not null references teams(id) on delete cascade,
  name                  text not null,
  prompt                text not null,
  default_country       text,
  default_product       text,
  default_message_angle text,
  default_filters       jsonb,
  created_by            uuid references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

-- -----------------------------------------------------------------------------
-- AFFILIATE PARTNERS
-- -----------------------------------------------------------------------------
create table affiliate_partners (
  id                      uuid primary key default gen_random_uuid(),
  team_id                 uuid not null references teams(id) on delete cascade,
  influencer_id           uuid references influencers(id) on delete set null,
  affiliate_name          text,
  affiliate_email         text,
  affiliate_phone         text,
  referral_code           text,
  tracking_link           text,
  commission_amount       integer,    -- AED
  payout_method           text,
  signed_date             date,
  status                  affiliate_status not null default 'invited',
  total_leads             integer default 0,
  total_confirmed_patients integer default 0,
  total_payout_due        numeric default 0,
  last_payout_date        date,
  created_by              uuid references profiles(id),
  updated_by              uuid references profiles(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);
create index affiliate_team_idx on affiliate_partners (team_id, status);

-- -----------------------------------------------------------------------------
-- AUDIT LOGS
-- -----------------------------------------------------------------------------
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid references teams(id) on delete cascade,
  actor_id    uuid references profiles(id),
  action      text not null,        -- e.g. 'influencer.delete'
  entity      text not null,        -- table name
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs (entity, entity_id);

-- -----------------------------------------------------------------------------
-- SETTINGS (per team key/value)
-- -----------------------------------------------------------------------------
create table settings (
  team_id     uuid not null references teams(id) on delete cascade,
  key         text not null,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (team_id, key)
);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array[
    'teams','profiles','campaigns','influencers','messages',
    'prompt_templates','affiliate_partners'
  ] loop
    execute format(
      'create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at()', t);
  end loop;
end$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- Helper: current user's team
create or replace function current_team_id() returns uuid as $$
  select team_id from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Helper: current user's role
create or replace function current_role_name() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Enable RLS on all domain tables
do $$
declare t text;
begin
  foreach t in array array[
    'teams','profiles','campaigns','influencers','categories',
    'influencer_categories','tags','influencer_tags','messages',
    'outreach_events','notes','imports','prompt_templates',
    'affiliate_partners','audit_logs','settings'
  ] loop
    execute format('alter table %s enable row level security', t);
  end loop;
end$$;

-- profiles: a user can read profiles in their team; only admins write roles
create policy profiles_select on profiles for select
  using (team_id = current_team_id() or id = auth.uid());
create policy profiles_update_self on profiles for update
  using (id = auth.uid());
create policy profiles_admin_all on profiles for all
  using (current_role_name() = 'admin' and team_id = current_team_id())
  with check (current_role_name() = 'admin' and team_id = current_team_id());

-- teams: members can read their team
create policy teams_select on teams for select
  using (id = current_team_id());

-- Generic team-scoped read for the rest
do $$
declare t text;
begin
  foreach t in array array[
    'campaigns','influencers','categories','tags','messages',
    'outreach_events','notes','imports','prompt_templates',
    'affiliate_partners','audit_logs','settings'
  ] loop
    execute format(
      'create policy %1$s_team_select on %1$s for select
       using (team_id = current_team_id())', t);
  end loop;
end$$;

-- Write policies: viewer = read only; outreach_assistant cannot delete;
-- sales_manager + admin can write; admin can do everything.
-- We model "can write" = role in (admin, sales_manager, outreach_assistant)
-- and "can delete" = role in (admin, sales_manager).

do $$
declare t text;
begin
  foreach t in array array[
    'campaigns','influencers','categories','tags','messages',
    'notes','prompt_templates','affiliate_partners','settings','imports'
  ] loop
    -- INSERT
    execute format(
      'create policy %1$s_insert on %1$s for insert
       with check (team_id = current_team_id()
         and current_role_name() in (''admin'',''sales_manager'',''outreach_assistant''))', t);
    -- UPDATE
    execute format(
      'create policy %1$s_update on %1$s for update
       using (team_id = current_team_id()
         and current_role_name() in (''admin'',''sales_manager'',''outreach_assistant''))
       with check (team_id = current_team_id())', t);
    -- DELETE (hard delete restricted; prefer soft delete via update)
    execute format(
      'create policy %1$s_delete on %1$s for delete
       using (team_id = current_team_id()
         and current_role_name() in (''admin'',''sales_manager''))', t);
  end loop;
end$$;

-- outreach_events: any writer can insert (timeline), no deletes
create policy outreach_events_insert on outreach_events for insert
  with check (team_id = current_team_id()
    and current_role_name() in ('admin','sales_manager','outreach_assistant'));

-- join tables follow influencer access
create policy infcat_all on influencer_categories for all
  using (exists (select 1 from influencers i where i.id = influencer_id and i.team_id = current_team_id()))
  with check (exists (select 1 from influencers i where i.id = influencer_id and i.team_id = current_team_id()));
create policy inftag_all on influencer_tags for all
  using (exists (select 1 from influencers i where i.id = influencer_id and i.team_id = current_team_id()))
  with check (exists (select 1 from influencers i where i.id = influencer_id and i.team_id = current_team_id()));

-- =============================================================================
-- New-user bootstrap: create a profile + personal team on signup
-- =============================================================================
create or replace function handle_new_user() returns trigger as $$
declare new_team uuid;
begin
  insert into teams (name) values (coalesce(new.raw_user_meta_data->>'team_name','My Team'))
    returning id into new_team;
  insert into profiles (id, team_id, email, full_name, role)
    values (new.id, new_team, new.email,
            new.raw_user_meta_data->>'full_name',
            'admin');  -- first user of a team is admin; change later
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
