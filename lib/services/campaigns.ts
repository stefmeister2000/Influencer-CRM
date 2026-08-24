import { db, uid, nowIso, insertRow, updateRow } from "../db";
import { mapCampaign } from "../db/map";
import type { Campaign } from "../types";
import { logAudit } from "./audit";

interface Ctx { teamId: string; userId: string; }

export function listCampaigns(teamId: string): Campaign[] {
  const rows = db.prepare(
    "select * from campaigns where team_id = ? and deleted_at is null order by created_at desc",
  ).all(teamId) as any[];
  return rows.map(mapCampaign);
}

export function getCampaign(teamId: string, id: string): Campaign {
  const row = db.prepare("select * from campaigns where team_id = ? and id = ?").get(teamId, id) as any;
  if (!row) throw new Error("Campaign not found");
  return mapCampaign(row);
}

export function createCampaign(ctx: Ctx, input: Partial<Campaign>): Campaign {
  const id = uid();
  insertRow("campaigns", {
    id,
    team_id: ctx.teamId,
    name: input.name ?? "Untitled campaign",
    country: input.country ?? null,
    city: input.city ?? null,
    target_category: input.target_category ?? null,
    product_focus: input.product_focus ?? null,
    search_prompt: input.search_prompt ?? null,
    parsed_filters: input.parsed_filters ? JSON.stringify(input.parsed_filters) : null,
    brand_voice: input.brand_voice ?? null,
    outreach_goal: input.outreach_goal ?? null,
    affiliate_payout: input.affiliate_payout ?? null,
    status: input.status ?? "draft",
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  const campaign = getCampaign(ctx.teamId, id);
  logAudit({ teamId: ctx.teamId, actorId: ctx.userId, action: "campaign.create", entity: "campaigns", entityId: id, after: campaign });
  return campaign;
}

export function deleteCampaign(ctx: Ctx, id: string) {
  updateRow("campaigns", id, ctx.teamId, {
    deleted_at: nowIso(), updated_by: ctx.userId, updated_at: nowIso(),
  });
}

export function updateCampaign(ctx: Ctx, id: string, patch: Partial<Campaign>) {
  const data: Record<string, unknown> = { ...patch, updated_by: ctx.userId, updated_at: nowIso() };
  if (patch.parsed_filters) data.parsed_filters = JSON.stringify(patch.parsed_filters);
  updateRow("campaigns", id, ctx.teamId, data);
  return getCampaign(ctx.teamId, id);
}
