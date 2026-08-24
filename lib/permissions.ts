import type { UserRole } from "./types";

// Mirrors the RLS policies in 0001_init.sql for fast UI gating.
// RLS remains the real enforcement boundary — this just hides controls.

export const can = {
  write: (role: UserRole) =>
    ["admin", "sales_manager", "outreach_assistant"].includes(role),
  delete: (role: UserRole) => ["admin", "sales_manager"].includes(role),
  approveMessages: (role: UserRole) => ["admin", "sales_manager"].includes(role),
  createCampaign: (role: UserRole) => ["admin", "sales_manager"].includes(role),
  updateStatus: (role: UserRole) =>
    ["admin", "sales_manager", "outreach_assistant"].includes(role),
  manageRoles: (role: UserRole) => role === "admin",
  manageTeam: (role: UserRole) => role === "admin",
};
