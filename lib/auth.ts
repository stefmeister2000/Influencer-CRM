import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { db, uid, nowIso, seedTeam } from "./db";
import type { UserRole } from "./types";

const COOKIE = "orvion_session";
/** Which company a platform admin is currently "viewing as" — see getSession(). */
const ACTIVE_TEAM_COOKIE = "orvion_active_team";

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET?.trim()) {
  console.warn(
    "[auth] AUTH_SECRET is not set — session cookies are signed with a fallback " +
    "secret that's baked into this (public) repo, so anyone could forge a valid " +
    "login cookie. Set AUTH_SECRET to a long random string (see DEPLOY.md).",
  );
}
const SECRET = process.env.AUTH_SECRET || "orvion-local-dev-secret-change-me";

export interface SessionContext {
  userId: string;
  email: string;
  fullName: string | null;
  /** The company currently being acted on — the user's own, unless a platform admin has switched. */
  teamId: string;
  /** Effective role for `teamId` above (always "admin" while a platform admin is viewing another company). */
  role: UserRole;
  isPlatformAdmin: boolean;
  /** The user's own company, regardless of which one they're currently viewing. */
  homeTeamId: string;
}

// --- password hashing (scrypt) ---------------------------------------------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && timingSafeEqual(test, ref);
}

// --- signed cookie ---------------------------------------------------------
function sign(userId: string): string {
  const sig = createHmac("sha256", SECRET).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

function unsign(value: string | undefined): string | null {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx < 0) return null;
  const userId = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = createHmac("sha256", SECRET).update(userId).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}

export function setSessionCookie(userId: string) {
  cookies().set(COOKIE, sign(userId), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
}

/** Platform-admin only: set (or clear, with null) which company they're viewing as. */
export function setActiveTeam(teamId: string | null) {
  if (teamId) {
    cookies().set(ACTIVE_TEAM_COOKIE, teamId, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    cookies().delete(ACTIVE_TEAM_COOKIE);
  }
}

// --- session lookup --------------------------------------------------------
export function getSession(): SessionContext | null {
  const userId = unsign(cookies().get(COOKIE)?.value);
  if (!userId) return null;
  const user = db.prepare(
    "select id, team_id, email, full_name, role, is_platform_admin from users where id = ?",
  ).get(userId) as any;
  if (!user) return null;

  const isPlatformAdmin = Boolean(user.is_platform_admin);
  let teamId: string = user.team_id;
  let role = (user.role ?? "viewer") as UserRole;

  if (isPlatformAdmin) {
    const activeTeam = cookies().get(ACTIVE_TEAM_COOKIE)?.value;
    if (activeTeam) {
      const exists = db.prepare("select id from teams where id = ?").get(activeTeam);
      if (exists) {
        teamId = activeTeam;
        role = "admin"; // the platform admin manages every company as its admin
      }
    }
  }

  return {
    userId: user.id, email: user.email, fullName: user.full_name,
    teamId, role, isPlatformAdmin, homeTeamId: user.team_id,
  };
}

export function requireSession(): SessionContext {
  const s = getSession();
  if (!s) redirect("/login");
  return s;
}

// --- account creation / login ----------------------------------------------
export function createAccount(args: {
  email: string; password: string; fullName?: string; teamName?: string;
}): { userId: string } {
  const existing = db.prepare("select id from users where email = ?").get(args.email);
  if (existing) throw new Error("An account with that email already exists.");

  // The very first person to ever sign up on this instance owns the platform
  // (can create/switch between companies). Existing instances get this
  // backfilled on the next boot instead — see runMigrations() in lib/db.
  const isFirstEver = userCount() === 0;

  const teamId = uid();
  db.prepare("insert into teams (id, name, created_at, updated_at) values (?,?,?,?)")
    .run(teamId, args.teamName || "My Team", nowIso(), nowIso());
  seedTeam(teamId);

  const userId = uid();
  // First user of a team is admin.
  db.prepare(
    `insert into users (id, team_id, email, full_name, role, password_hash, is_platform_admin, created_at, updated_at)
     values (?,?,?,?,?,?,?,?,?)`,
  ).run(userId, teamId, args.email, args.fullName ?? null, "admin",
        hashPassword(args.password), isFirstEver ? 1 : 0, nowIso(), nowIso());

  return { userId };
}

export function authenticate(email: string, password: string): { userId: string } | null {
  const user = db.prepare("select id, password_hash from users where email = ?")
    .get(email) as any;
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return { userId: user.id };
}

export function userCount(): number {
  return (db.prepare("select count(*) as n from users").get() as any).n;
}

// --- team identity -----------------------------------------------------------

export function getTeamName(teamId: string): string {
  const row = db.prepare("select name from teams where id = ?").get(teamId) as { name: string } | undefined;
  return row?.name ?? "";
}

export function renameTeam(teamId: string, name: string) {
  const clean = name.trim();
  if (!clean) throw new Error("Company name can't be empty.");
  db.prepare("update teams set name = ?, updated_at = ? where id = ?").run(clean, nowIso(), teamId);
}

// --- platform admin: multiple companies ---------------------------------------

export interface CompanySummary {
  id: string; name: string; created_at: string; member_count: number; influencer_count: number;
}

/** Every company on this instance, for the platform admin's switcher. */
export function listAllCompanies(): CompanySummary[] {
  return db.prepare(`
    select t.id, t.name, t.created_at,
      (select count(*) from users u where u.team_id = t.id) as member_count,
      (select count(*) from influencers i where i.team_id = t.id and i.deleted_at is null) as influencer_count
    from teams t order by t.created_at asc
  `).all() as CompanySummary[];
}

/** Platform-admin only: spin up a brand-new company (its own team, generic starter categories, no members yet). */
export function createCompany(name: string): { teamId: string } {
  const clean = name.trim();
  if (!clean) throw new Error("Company name can't be empty.");
  const teamId = uid();
  db.prepare("insert into teams (id, name, created_at, updated_at) values (?,?,?,?)")
    .run(teamId, clean, nowIso(), nowIso());
  seedTeam(teamId);
  return { teamId };
}

// --- self-service profile edits ----------------------------------------------

export function updateProfile(
  userId: string, args: { fullName?: string; newPassword?: string },
) {
  if (args.newPassword) {
    if (args.newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
    db.prepare("update users set full_name = ?, password_hash = ?, updated_at = ? where id = ?")
      .run(args.fullName?.trim() || null, hashPassword(args.newPassword), nowIso(), userId);
  } else {
    db.prepare("update users set full_name = ?, updated_at = ? where id = ?")
      .run(args.fullName?.trim() || null, nowIso(), userId);
  }
}

// --- invites -------------------------------------------------------------------

export interface Invite {
  id: string; team_id: string; token: string; email: string | null;
  role: UserRole; created_at: string; expires_at: string | null; accepted_at: string | null;
}
export interface InviteWithTeam extends Invite { team_name: string; }

/**
 * Generate a shareable invite link. No email is sent — share the link yourself.
 * Defaults to the caller's own team; pass `teamId` to target a different
 * company (platform admins only — enforced at the action layer).
 */
export function createInvite(
  ctx: { teamId: string; userId: string }, args: { role: UserRole; email?: string; teamId?: string },
): { token: string } {
  const id = uid();
  const token = randomBytes(24).toString("hex");
  const targetTeam = args.teamId || ctx.teamId;
  db.prepare(
    `insert into invites (id, team_id, token, email, role, created_by, created_at)
     values (?,?,?,?,?,?,?)`,
  ).run(id, targetTeam, token, args.email?.trim() || null, args.role, ctx.userId, nowIso());
  return { token };
}

/** Pending (unaccepted) invites for a team, newest first. */
export function listInvites(teamId: string): Invite[] {
  return db.prepare(
    `select id, team_id, token, email, role, created_at, expires_at, accepted_at
     from invites where team_id = ? and accepted_at is null order by created_at desc`,
  ).all(teamId) as Invite[];
}

export function revokeInvite(teamId: string, id: string) {
  db.prepare("delete from invites where id = ? and team_id = ?").run(id, teamId);
}

export function getInviteByToken(token: string): InviteWithTeam | null {
  const row = db.prepare(
    `select i.id, i.team_id, i.token, i.email, i.role, i.created_at, i.expires_at, i.accepted_at,
            t.name as team_name
     from invites i join teams t on t.id = i.team_id where i.token = ?`,
  ).get(token) as InviteWithTeam | undefined;
  return row ?? null;
}

/** Validate an invite token and explain why it can't be used, if it can't. */
export function inviteStatus(invite: InviteWithTeam | null): string | null {
  if (!invite) return "This invite link is invalid.";
  if (invite.accepted_at) return "This invite has already been used.";
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return "This invite has expired.";
  return null;
}

/** Accept an invite: creates a user under the invite's team at the invite's role. */
export function acceptInvite(
  token: string, args: { email: string; password: string; fullName?: string },
): { userId: string } {
  const invite = getInviteByToken(token);
  const problem = inviteStatus(invite);
  if (problem || !invite) throw new Error(problem ?? "This invite link is invalid.");
  if (args.password.length < 6) throw new Error("Password must be at least 6 characters.");

  const existing = db.prepare("select id from users where email = ?").get(args.email);
  if (existing) throw new Error("An account with that email already exists.");

  const userId = uid();
  db.prepare(
    `insert into users (id, team_id, email, full_name, role, password_hash, created_at, updated_at)
     values (?,?,?,?,?,?,?,?)`,
  ).run(userId, invite.team_id, args.email, args.fullName?.trim() || null, invite.role,
        hashPassword(args.password), nowIso(), nowIso());

  db.prepare("update invites set accepted_at = ?, accepted_by = ? where id = ?")
    .run(nowIso(), userId, invite.id);

  return { userId };
}
