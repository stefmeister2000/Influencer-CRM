import { db, uid, nowIso } from "../db";

interface Ctx { teamId: string; userId: string; }
export interface Tag { id: string; name: string; }

/**
 * Per-team, user-managed lists used as quick-pick chips in Discovery:
 * - Locations: cities/markets you target (nothing hardcoded — every business
 *   operates in different places, so teams add their own).
 * - Categories: creator niches, seeded with generic starters and freely
 *   editable from there.
 */

export function listLocations(teamId: string): Tag[] {
  return db.prepare(
    "select id, name from locations where team_id = ? order by name",
  ).all(teamId) as Tag[];
}

export function addLocation(ctx: Ctx, name: string): Tag {
  const clean = name.trim();
  if (!clean) throw new Error("Location name can't be empty.");
  const existing = db.prepare(
    "select id, name from locations where team_id = ? and lower(name) = lower(?)",
  ).get(ctx.teamId, clean) as Tag | undefined;
  if (existing) return existing;
  const id = uid();
  db.prepare("insert into locations (id, team_id, name, created_at) values (?,?,?,?)")
    .run(id, ctx.teamId, clean, nowIso());
  return { id, name: clean };
}

export function deleteLocation(ctx: Ctx, id: string) {
  db.prepare("delete from locations where id = ? and team_id = ?").run(id, ctx.teamId);
}

export function listCategories(teamId: string): Tag[] {
  return db.prepare(
    "select id, name from categories where team_id = ? order by name",
  ).all(teamId) as Tag[];
}

export function addCategory(ctx: Ctx, name: string): Tag {
  const clean = name.trim();
  if (!clean) throw new Error("Category name can't be empty.");
  const existing = db.prepare(
    "select id, name from categories where team_id = ? and lower(name) = lower(?)",
  ).get(ctx.teamId, clean) as Tag | undefined;
  if (existing) return existing;
  const id = uid();
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  db.prepare(
    "insert into categories (id, team_id, name, slug, is_default, created_at) values (?,?,?,?,0,?)",
  ).run(id, ctx.teamId, clean, slug, nowIso());
  return { id, name: clean };
}

export function deleteCategory(ctx: Ctx, id: string) {
  db.prepare("delete from categories where id = ? and team_id = ?").run(id, ctx.teamId);
}
