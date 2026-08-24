import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { db, uid, nowIso, seedTeam } from "./db";
import type { UserRole } from "./types";

const COOKIE = "orvion_session";
const SECRET = process.env.AUTH_SECRET || "orvion-local-dev-secret-change-me";

export interface SessionContext {
  userId: string;
  email: string;
  fullName: string | null;
  teamId: string;
  role: UserRole;
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
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
}

// --- session lookup --------------------------------------------------------
export function getSession(): SessionContext | null {
  const userId = unsign(cookies().get(COOKIE)?.value);
  if (!userId) return null;
  const user = db.prepare(
    "select id, team_id, email, full_name, role from users where id = ?",
  ).get(userId) as any;
  if (!user) return null;
  return {
    userId: user.id, email: user.email, fullName: user.full_name,
    teamId: user.team_id, role: (user.role ?? "viewer") as UserRole,
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

  const teamId = uid();
  db.prepare("insert into teams (id, name, created_at, updated_at) values (?,?,?,?)")
    .run(teamId, args.teamName || "My Team", nowIso(), nowIso());
  seedTeam(teamId);

  const userId = uid();
  // First user of a team is admin.
  db.prepare(
    `insert into users (id, team_id, email, full_name, role, password_hash, created_at, updated_at)
     values (?,?,?,?,?,?,?,?)`,
  ).run(userId, teamId, args.email, args.fullName ?? null, "admin",
        hashPassword(args.password), nowIso(), nowIso());

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
