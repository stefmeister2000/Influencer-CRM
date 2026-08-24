import { db, nowIso } from "../db";

interface Ctx { teamId: string; userId: string; }

/** Read a per-team setting value (JSON-decoded). */
export function getSetting<T = unknown>(teamId: string, key: string): T | null {
  const row = db.prepare("select value from settings where team_id = ? and key = ?")
    .get(teamId, key) as { value: string } | undefined;
  if (!row) return null;
  try { return JSON.parse(row.value) as T; } catch { return null; }
}

/** Upsert a per-team setting value (JSON-encoded). */
export function setSetting(ctx: Ctx, key: string, value: unknown) {
  db.prepare(
    `insert into settings (team_id, key, value, updated_at) values (?,?,?,?)
     on conflict(team_id, key) do update set value = excluded.value, updated_at = excluded.updated_at`,
  ).run(ctx.teamId, key, JSON.stringify(value), nowIso());
}

export const CONTENT_KNOWLEDGE_KEY = "content_knowledge";
