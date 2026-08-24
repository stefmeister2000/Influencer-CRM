import { db, uid, nowIso } from "../db";
import type { EventInsert } from "./types";

/** Append an entry to the immutable audit log. Best-effort (never throws). */
export function logAudit(args: {
  teamId: string; actorId: string; action: string; entity: string;
  entityId?: string; before?: unknown; after?: unknown;
}) {
  try {
    db.prepare(
      `insert into audit_logs (id, team_id, actor_id, action, entity, entity_id, before, after, created_at)
       values (?,?,?,?,?,?,?,?,?)`,
    ).run(uid(), args.teamId, args.actorId, args.action, args.entity,
          args.entityId ?? null,
          args.before ? JSON.stringify(args.before) : null,
          args.after ? JSON.stringify(args.after) : null, nowIso());
  } catch { /* swallow */ }
}

/** Append an outreach/timeline event for an influencer. */
export function logEvent(e: EventInsert) {
  try {
    db.prepare(
      `insert into outreach_events (id, team_id, influencer_id, type, detail, metadata, actor_id, created_at)
       values (?,?,?,?,?,?,?,?)`,
    ).run(uid(), e.teamId, e.influencerId, e.type, e.detail ?? null,
          e.metadata ? JSON.stringify(e.metadata) : null, e.actorId ?? null, nowIso());
  } catch { /* swallow */ }
}
