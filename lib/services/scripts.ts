import { db, uid, nowIso, insertRow, updateRow } from "../db";

export type ScriptStatus = "draft" | "in_progress" | "video_made";

export interface ContentScript {
  id: string;
  team_id: string;
  /** Free-text topic/subject for the piece (stored in the legacy `category` column). */
  topic: string;
  brief: string | null;
  body: string;
  status: ScriptStatus;
  used_web_search: number;
  language: string;
  format: string;
  created_at: string;
  updated_at: string;
}

interface Ctx { teamId: string; userId: string; }

export function saveScript(ctx: Ctx, args: {
  topic: string; brief: string; body: string; usedWebSearch: boolean;
  language?: string; format?: string;
}): ContentScript {
  const id = uid();
  insertRow("content_scripts", {
    id,
    team_id: ctx.teamId,
    category: args.topic || "general",
    brief: args.brief || null,
    body: args.body,
    status: "draft",
    used_web_search: args.usedWebSearch ? 1 : 0,
    language: args.language ?? "en",
    format: args.format ?? "video",
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  return getScript(ctx.teamId, id);
}

/** Recent English scripts — used to tell the AI what angles to avoid repeating. */
export function recentScripts(teamId: string, limit = 8): ContentScript[] {
  return db.prepare(
    `select *, category as topic from content_scripts
     where team_id = ? and deleted_at is null and (language = 'en' or language is null)
     order by created_at desc limit ?`,
  ).all(teamId, limit) as ContentScript[];
}

export function getScript(teamId: string, id: string): ContentScript {
  return db.prepare("select *, category as topic from content_scripts where id = ? and team_id = ?")
    .get(id, teamId) as ContentScript;
}

export function listScripts(teamId: string): ContentScript[] {
  return db.prepare(
    "select *, category as topic from content_scripts where team_id = ? and deleted_at is null order by created_at desc",
  ).all(teamId) as ContentScript[];
}

export function setScriptStatus(ctx: Ctx, id: string, status: ScriptStatus) {
  updateRow("content_scripts", id, ctx.teamId, { status, updated_at: nowIso(), updated_by: ctx.userId });
}

export function updateScriptBody(ctx: Ctx, id: string, body: string) {
  updateRow("content_scripts", id, ctx.teamId, { body, updated_at: nowIso(), updated_by: ctx.userId });
}

export function deleteScript(ctx: Ctx, id: string) {
  updateRow("content_scripts", id, ctx.teamId, { deleted_at: nowIso(), updated_by: ctx.userId });
}
