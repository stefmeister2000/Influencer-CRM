import { db, uid, nowIso, insertRow, updateRow } from "../db";
import { mapInfluencer } from "../db/map";
import type { FilterParams, Influencer, InfluencerStatus, OutreachStatus } from "../types";
import type { NormalizedProfile } from "../providers/types";
import { PAGE_SIZE } from "../constants";
import { logAudit, logEvent } from "./audit";
import { findDuplicate, type DuplicateStrategy } from "./duplicates";

interface Ctx { teamId: string; userId: string; }

/** Paginated, filtered list for the influencer table. */
export function listInfluencers(
  teamId: string, f: FilterParams,
): { rows: Influencer[]; count: number } {
  const where: string[] = ["team_id = ?", "deleted_at is null"];
  const args: unknown[] = [teamId];

  if (f.q) { where.push("(instagram_username like ? or full_name like ?)"); args.push(`%${f.q}%`, `%${f.q}%`); }

  // View tabs: a status group. Explicit `status` filter (if set) takes precedence.
  if (!f.status && f.view && f.view !== "all") {
    const groups: Record<string, string[]> = {
      review: ["new", "needs_review"],
      approved: ["approved", "contacted", "responded", "interested", "negotiating", "onboarded"],
      rejected: ["rejected", "not_interested"],
    };
    const g = groups[f.view];
    if (g) { where.push(`status in (${g.map(() => "?").join(",")})`); args.push(...g); }
  }

  if (f.platform) { where.push("platform = ?"); args.push(f.platform); }
  if (f.country) { where.push("country = ?"); args.push(f.country); }
  if (f.city) { where.push("city = ?"); args.push(f.city); }
  if (f.category) { where.push("category like ?"); args.push(`%${f.category}%`); }
  if (f.product_focus) { where.push("product_fit = ?"); args.push(f.product_focus); }
  if (f.status) { where.push("status = ?"); args.push(f.status); }
  if (f.outreach_status) { where.push("outreach_status = ?"); args.push(f.outreach_status); }
  if (f.affiliate_status) { where.push("affiliate_status = ?"); args.push(f.affiliate_status); }
  if (f.language) { where.push("language = ?"); args.push(f.language); }
  if (f.campaign_id) { where.push("campaign_id = ?"); args.push(f.campaign_id); }
  if (f.source) { where.push("source = ?"); args.push(f.source); }
  if (f.follower_min != null) { where.push("follower_count >= ?"); args.push(f.follower_min); }
  if (f.follower_max != null) { where.push("follower_count <= ?"); args.push(f.follower_max); }
  if (f.score_min != null) { where.push("final_score >= ?"); args.push(f.score_min); }
  if (f.score_max != null) { where.push("final_score <= ?"); args.push(f.score_max); }

  const whereSql = where.join(" and ");
  const count = (db.prepare(`select count(*) as n from influencers where ${whereSql}`)
    .get(...args) as any).n as number;

  const [col, dir] = (f.sort ?? "final_score.desc").split(".");
  const safeCol = ["final_score", "follower_count", "created_at", "engagement_rate"].includes(col)
    ? col : "final_score";
  const safeDir = dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, f.page ?? 1);

  const rows = db.prepare(
    `select * from influencers where ${whereSql}
     order by ${safeCol} ${safeDir} nulls last
     limit ? offset ?`,
  ).all(...args, PAGE_SIZE, (page - 1) * PAGE_SIZE) as any[];

  return { rows: rows.map(mapInfluencer), count };
}

export function getInfluencer(teamId: string, id: string): Influencer {
  const row = db.prepare("select * from influencers where team_id = ? and id = ?")
    .get(teamId, id) as any;
  if (!row) throw new Error("Influencer not found");
  return mapInfluencer(row);
}

export function countByCampaign(teamId: string, campaignId: string): number {
  return (db.prepare(
    "select count(*) as n from influencers where team_id = ? and campaign_id = ? and deleted_at is null",
  ).get(teamId, campaignId) as any).n;
}

/** Insert a profile honoring a duplicate strategy. */
export function upsertInfluencer(
  ctx: Ctx, profile: NormalizedProfile,
  opts: {
    campaignId?: string | null; strategy?: DuplicateStrategy;
    status?: InfluencerStatus; dedupeIncludeDeleted?: boolean;
  } = {},
): { influencer: Influencer | null; outcome: "inserted" | "updated" | "skipped" } {
  const dup = findDuplicate(ctx.teamId, profile, opts.dedupeIncludeDeleted ?? false);
  const strategy = opts.strategy ?? "skip";

  if (dup) {
    if (strategy === "skip") return { influencer: null, outcome: "skipped" };
    if (strategy === "update" || strategy === "merge") {
      updateRow("influencers", dup.existing.id, ctx.teamId,
        { ...stripEmpty(profile), updated_by: ctx.userId, updated_at: nowIso() });
      return { influencer: getInfluencer(ctx.teamId, dup.existing.id), outcome: "updated" };
    }
    profile = { ...profile, instagram_username: `${profile.instagram_username}-dup` };
  }

  const id = uid();
  insertRow("influencers", {
    id,
    team_id: ctx.teamId,
    campaign_id: opts.campaignId ?? null,
    instagram_username: profile.instagram_username,
    platform: profile.platform ?? "instagram",
    profile_url: profile.profile_url ?? null,
    full_name: profile.full_name ?? null,
    bio: profile.bio ?? null,
    profile_picture_url: profile.profile_picture_url ?? null,
    follower_count: profile.follower_count ?? null,
    following_count: profile.following_count ?? null,
    post_count: profile.post_count ?? null,
    avg_likes: profile.avg_likes ?? null,
    avg_comments: profile.avg_comments ?? null,
    engagement_rate: profile.engagement_rate ?? null,
    country: profile.country ?? null,
    city: profile.city ?? null,
    language: profile.language ?? null,
    email: profile.email ?? null,
    whatsapp: profile.whatsapp ?? null,
    website: profile.website ?? null,
    category: profile.category ?? null,
    subcategory: profile.subcategory ?? null,
    product_fit: profile.product_fit ?? null,
    brand_fit_score: profile.brand_fit_score ?? null,
    engagement_score: profile.engagement_score ?? null,
    quality_score: profile.quality_score ?? null,
    risk_score: profile.risk_score ?? null,
    final_score: profile.final_score ?? null,
    ai_recommendation: profile.ai_recommendation ?? null,
    ai_reasoning: profile.ai_reasoning ?? null,
    best_product_angle: profile.best_product_angle ?? null,
    best_message_style: profile.best_message_style ?? null,
    risk_warning: profile.risk_warning ?? null,
    notes: profile.notes ?? null,
    source: profile.source ?? "manual",
    status: opts.status ?? "needs_review",
    outreach_status: "not_ready",
    affiliate_status: "not_affiliate",
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  logEvent({
    teamId: ctx.teamId, influencerId: id, actorId: ctx.userId,
    type: profile.source === "csv" ? "imported" : "profile_added",
    detail: `Added @${profile.instagram_username} (${profile.source})`,
  });
  return { influencer: getInfluencer(ctx.teamId, id), outcome: "inserted" };
}

export function updateInfluencer(ctx: Ctx, id: string, patch: Partial<Influencer>) {
  const before = getInfluencer(ctx.teamId, id);
  updateRow("influencers", id, ctx.teamId, { ...patch, updated_by: ctx.userId, updated_at: nowIso() });
  const after = getInfluencer(ctx.teamId, id);
  logAudit({
    teamId: ctx.teamId, actorId: ctx.userId, action: "influencer.update",
    entity: "influencers", entityId: id, before, after,
  });
  return after;
}

export function setStatus(
  ctx: Ctx, id: string,
  patch: { status?: InfluencerStatus; outreach_status?: OutreachStatus },
) {
  const updated = updateInfluencer(ctx, id, patch);
  logEvent({
    teamId: ctx.teamId, influencerId: id, actorId: ctx.userId, type: "status_changed",
    detail: `Status → ${patch.status ?? ""} ${patch.outreach_status ?? ""}`.trim(),
  });
  return updated;
}

export function softDelete(ctx: Ctx, id: string) {
  updateRow("influencers", id, ctx.teamId,
    { deleted_at: nowIso(), status: "deleted", updated_by: ctx.userId, updated_at: nowIso() });
  logEvent({ teamId: ctx.teamId, influencerId: id, actorId: ctx.userId, type: "deleted" });
  logAudit({ teamId: ctx.teamId, actorId: ctx.userId, action: "influencer.soft_delete", entity: "influencers", entityId: id });
}

export function restore(ctx: Ctx, id: string) {
  updateRow("influencers", id, ctx.teamId,
    { deleted_at: null, status: "needs_review", updated_by: ctx.userId, updated_at: nowIso() });
  logEvent({ teamId: ctx.teamId, influencerId: id, actorId: ctx.userId, type: "restored" });
}

export function listNotes(influencerId: string) {
  return db.prepare(
    "select * from notes where influencer_id = ? and deleted_at is null order by created_at desc",
  ).all(influencerId) as any[];
}

export function listEvents(influencerId: string, limit = 40) {
  return db.prepare(
    "select * from outreach_events where influencer_id = ? order by created_at desc limit ?",
  ).all(influencerId, limit) as any[];
}

function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }
  return out as Partial<T>;
}
