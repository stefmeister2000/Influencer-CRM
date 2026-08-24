"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createCampaign, updateCampaign, getCampaign, deleteCampaign } from "@/lib/services/campaigns";
import { runDiscovery } from "@/lib/services/discovery";
import { parsePrompt } from "@/lib/ai/promptParser";
import type { DiscoveryFilters } from "@/lib/types";

export async function parsePromptAction(prompt: string): Promise<DiscoveryFilters> {
  const ctx = requireSession();
  const { getBusinessContext } = await import("@/lib/services/business");
  return parsePrompt(prompt, getBusinessContext(ctx.teamId));
}

export async function createCampaignAction(formData: FormData) {
  const ctx = requireSession();
  if (!can.createCampaign(ctx.role)) throw new Error("Not allowed");

  const filtersRaw = formData.get("parsed_filters");
  const parsed_filters = filtersRaw ? JSON.parse(String(filtersRaw)) : null;

  const campaign = createCampaign(ctx, {
    name: String(formData.get("name") ?? "Untitled campaign"),
    country: str(formData, "country"),
    city: str(formData, "city"),
    target_category: str(formData, "target_category"),
    product_focus: str(formData, "product_focus"),
    search_prompt: str(formData, "search_prompt"),
    brand_voice: str(formData, "brand_voice"),
    outreach_goal: str(formData, "outreach_goal"),
    affiliate_payout: num(formData, "affiliate_payout"),
    parsed_filters,
    status: "active",
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

export async function runDiscoveryAction(campaignId: string) {
  const ctx = requireSession();
  const campaign = getCampaign(ctx.teamId, campaignId);
  const result = await runDiscovery(ctx, campaign);
  revalidatePath("/review");
  revalidatePath(`/campaigns/${campaignId}`);
  return result;
}

export async function deleteCampaignAction(id: string) {
  const ctx = requireSession();
  if (!can.delete(ctx.role)) throw new Error("Not allowed");
  deleteCampaign(ctx, id);
  revalidatePath("/campaigns");
}

export async function updateCampaignStatusAction(id: string, status: string) {
  const ctx = requireSession();
  if (!can.createCampaign(ctx.role)) throw new Error("Not allowed");
  updateCampaign(ctx, id, { status: status as any });
  revalidatePath("/campaigns");
}

const str = (f: FormData, k: string) => { const v = f.get(k); return v ? String(v) : null; };
const num = (f: FormData, k: string) => { const v = f.get(k); return v ? Number(v) : null; };
