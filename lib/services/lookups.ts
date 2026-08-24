import { db, uid, nowIso, insertRow } from "../db";
import { logEvent } from "./audit";

interface Ctx { teamId: string; userId: string; }

export function listTemplates(teamId: string) {
  return db.prepare(
    "select * from prompt_templates where team_id = ? and deleted_at is null order by name",
  ).all(teamId) as any[];
}

export function listAffiliates(teamId: string) {
  return db.prepare(
    "select * from affiliate_partners where team_id = ? and deleted_at is null order by created_at desc",
  ).all(teamId) as any[];
}

export function listMembers(teamId: string) {
  return db.prepare(
    "select id, email, full_name, role from users where team_id = ? order by email",
  ).all(teamId) as any[];
}

export function addNote(ctx: Ctx, influencerId: string, body: string) {
  insertRow("notes", {
    id: uid(), team_id: ctx.teamId, influencer_id: influencerId, body,
    created_by: ctx.userId, created_at: nowIso(),
  });
  logEvent({
    teamId: ctx.teamId, influencerId, actorId: ctx.userId, type: "note_added",
    detail: body.slice(0, 120),
  });
}

export function recordImport(ctx: Ctx, r: {
  campaignId?: string | null; total: number; inserted: number; updated: number;
  skipped: number; errors: string[];
}) {
  insertRow("imports", {
    id: uid(), team_id: ctx.teamId, campaign_id: r.campaignId ?? null,
    total_rows: r.total, inserted: r.inserted, updated: r.updated, skipped: r.skipped,
    errors: r.errors.length ? JSON.stringify(r.errors) : null,
    created_by: ctx.userId, created_at: nowIso(),
  });
}

export function updateRole(ctx: Ctx, targetUserId: string, role: string) {
  db.prepare("update users set role = ?, updated_at = ? where id = ? and team_id = ?")
    .run(role, nowIso(), targetUserId, ctx.teamId);
}
