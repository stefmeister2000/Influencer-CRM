import { db, uid, nowIso, insertRow } from "../db";
import { logEvent } from "./audit";

interface Ctx { teamId: string; userId: string; }

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

/**
 * Remove a teammate from this company. Can't remove yourself (use "Sign out"),
 * and can't remove the last remaining admin — that would leave the company
 * with nobody able to manage it. Their past notes/messages/imports stay
 * attributed to them (created_by is just a label, not a foreign key).
 */
export function removeMember(ctx: Ctx, targetUserId: string) {
  if (targetUserId === ctx.userId) throw new Error("You can't remove yourself.");
  const target = db.prepare("select role from users where id = ? and team_id = ?")
    .get(targetUserId, ctx.teamId) as { role: string } | undefined;
  if (!target) throw new Error("That person isn't on this team.");
  if (target.role === "admin") {
    const adminCount = (db.prepare(
      "select count(*) as n from users where team_id = ? and role = 'admin'",
    ).get(ctx.teamId) as any).n;
    if (adminCount <= 1) throw new Error("Can't remove the only admin — make someone else admin first.");
  }
  db.prepare("delete from users where id = ? and team_id = ?").run(targetUserId, ctx.teamId);
}
