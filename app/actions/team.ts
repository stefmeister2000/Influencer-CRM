"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { updateRole } from "@/lib/services/lookups";
import { saveThemeColor } from "@/lib/services/business";
import { isValidHexColor } from "@/lib/theme";
import {
  createInvite, revokeInvite, renameTeam, updateProfile,
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

/** Generate a shareable invite link. No email is sent — copy the returned link and share it yourself. */
export async function createInviteAction(role: UserRole, email: string): Promise<{ token: string }> {
  const ctx = requireSession();
  if (!can.manageTeam(ctx.role)) throw new Error("Only admins can invite teammates");
  const { token } = createInvite(ctx, { role, email });
  logAudit({
    teamId: ctx.teamId, actorId: ctx.userId, action: "invite.created",
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

/** Admin-only: rename the company/team. Distinct from the marketing "business name" in the Business profile. */
export async function renameTeamAction(name: string) {
  const ctx = requireSession();
  if (!can.manageTeam(ctx.role)) throw new Error("Only admins can rename the company");
  renameTeam(ctx.teamId, name);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
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
