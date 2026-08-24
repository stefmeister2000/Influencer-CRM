"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { updateRole } from "@/lib/services/lookups";
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
