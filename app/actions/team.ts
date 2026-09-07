"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { updateRole } from "@/lib/services/lookups";
import { saveThemeColor } from "@/lib/services/business";
import { isValidHexColor } from "@/lib/theme";
import {
  createInvite, revokeInvite, renameTeam, updateProfile,
  setActiveTeam, listAllCompanies, createCompany, type CompanySummary,
} from "@/lib/auth";
import { logAudit } from "@/lib/services/audit";
import type { UserRole } from "@/lib/types";

export async function updateRoleAction(targetUserId: string, role: UserRole) {
  const ctx = requireSession();
  if (!can.manageRoles(ctx.role)) throw new Error("Only admins can change roles");
  updateRole(ctx, targetUserId, role);
  logAudit({
    teamId: ctx.teamId, actorId: ctx.userId, action: "profile.role_change",
    entity: "users", entityId: targetUserId, after: { role },
  });
  revalidatePath("/settings");
}

/**
 * Generate a shareable invite link. No email is sent — copy the returned link
 * and share it yourself. `teamId` lets a platform admin target a company
 * other than the one they're currently viewing; ignored for everyone else.
 */
export async function createInviteAction(
  role: UserRole, email: string, teamId?: string,
): Promise<{ token: string }> {
  const ctx = requireSession();
  if (!can.manageTeam(ctx.role)) throw new Error("Only admins can invite teammates");
  const targetTeam = ctx.isPlatformAdmin && teamId ? teamId : ctx.teamId;
  const { token } = createInvite(ctx, { role, email, teamId: targetTeam });
  logAudit({
    teamId: targetTeam, actorId: ctx.userId, action: "invite.created",
    entity: "invites", after: { role, email: email || null },
  });
  revalidatePath("/settings");
  return { token };
}

export async function revokeInviteAction(id: string) {
  const ctx = requireSession();
  if (!can.manageTeam(ctx.role)) throw new Error("Only admins can manage invites");
  revokeInvite(ctx.teamId, id);
  revalidatePath("/settings");
}

/**
 * Admin-only: rename a company. Distinct from the marketing "business name" in
 * the Business profile. `teamId` lets a platform admin rename any company
 * straight from the /companies list, without switching into it first;
 * ignored (defaults to their own team) for everyone else.
 */
export async function renameTeamAction(name: string, teamId?: string) {
  const ctx = requireSession();
  if (!can.manageTeam(ctx.role)) throw new Error("Only admins can rename the company");
  const targetTeam = ctx.isPlatformAdmin && teamId ? teamId : ctx.teamId;
  renameTeam(targetTeam, name);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/companies");
}

/** Any signed-in user can update their own display name and, optionally, their password. */
export async function updateProfileAction(formData: FormData) {
  const ctx = requireSession();
  const fullName = String(formData.get("full_name") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  updateProfile(ctx.userId, { fullName, newPassword: newPassword || undefined });
  revalidatePath("/settings");
}

/** Admin-only: this team's brand color. Pass null/empty to reset to the app default. */
export async function saveThemeColorAction(hex: string | null) {
  const ctx = requireSession();
  if (!can.manageTeam(ctx.role)) throw new Error("Only admins can change the brand color");
  if (hex && !isValidHexColor(hex)) throw new Error("That doesn't look like a valid color (use e.g. #23695A).");
  saveThemeColor(ctx, hex);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/");
}

// --- platform admin: multiple companies ---------------------------------------

export async function listCompaniesAction(): Promise<CompanySummary[]> {
  const ctx = requireSession();
  if (!ctx.isPlatformAdmin) throw new Error("Not allowed");
  return listAllCompanies();
}

/** Platform-admin only: create a brand-new company (its own team, no members yet). */
export async function createCompanyAction(name: string): Promise<{ teamId: string }> {
  const ctx = requireSession();
  if (!ctx.isPlatformAdmin) throw new Error("Only the platform admin can create companies");
  const result = createCompany(name);
  logAudit({
    teamId: result.teamId, actorId: ctx.userId, action: "company.created",
    entity: "teams", entityId: result.teamId, after: { name },
  });
  revalidatePath("/companies");
  return result;
}

/** Platform-admin only: view/act as a different company, or pass null to return to your own. */
export async function switchCompanyAction(teamId: string | null) {
  const ctx = requireSession();
  if (!ctx.isPlatformAdmin) throw new Error("Not allowed");
  setActiveTeam(teamId);
  revalidatePath("/", "layout");
}
