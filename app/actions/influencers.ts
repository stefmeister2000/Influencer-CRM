"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  upsertInfluencer, updateInfluencer, setStatus, softDelete, restore, getInfluencer,
} from "@/lib/services/influencers";
import { getCampaign } from "@/lib/services/campaigns";
import { addNote } from "@/lib/services/lookups";
import { generateAndSave, setMessageState } from "@/lib/services/messages";
import { scoreInfluencer } from "@/lib/ai/scoring";
import { logEvent } from "@/lib/services/audit";
import { normalizeProfileData } from "@/lib/providers/types";
import type { InfluencerStatus, OutreachStatus, MessageKind } from "@/lib/types";

export async function addInfluencerAction(formData: FormData) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");

  const profile = normalizeProfileData({
    instagram_username: String(formData.get("instagram_username") ?? "").trim(),
    platform: (s(formData, "platform") === "tiktok" ? "tiktok" : "instagram"),
    full_name: s(formData, "full_name"),
    profile_url: s(formData, "profile_url"),
    country: s(formData, "country"),
    city: s(formData, "city"),
    category: s(formData, "category"),
    email: s(formData, "email"),
    whatsapp: s(formData, "whatsapp"),
    follower_count: n(formData, "follower_count"),
    notes: s(formData, "notes"),
    source: "manual",
  });

  const campaignId = s(formData, "campaign_id");
  const { influencer, outcome } = upsertInfluencer(ctx, profile, {
    campaignId, strategy: "skip", status: "needs_review",
  });
  revalidatePath("/influencers");
  return { outcome, id: influencer?.id ?? null };
}

export async function scoreInfluencerAction(id: string) {
  const ctx = requireSession();
  const inf = getInfluencer(ctx.teamId, id);
  let filters = null;
  if (inf.campaign_id) {
    try { filters = getCampaign(ctx.teamId, inf.campaign_id).parsed_filters; } catch { /* ignore */ }
  }
  const { getBusinessContext } = await import("@/lib/services/business");
  const score = await scoreInfluencer(inf, filters, getBusinessContext(ctx.teamId));
  updateInfluencer(ctx, id, {
    product_fit: score.product_fit,
    brand_fit_score: score.brand_fit_score,
    engagement_score: score.engagement_score,
    quality_score: score.quality_score,
    risk_score: score.risk_score,
    final_score: score.final_score,
    ai_recommendation: score.recommendation,
    ai_reasoning: score.reasoning,
    best_product_angle: score.best_product_angle,
    best_message_style: score.best_message_style,
    risk_warning: score.risk_warning || null,
  });
  logEvent({
    teamId: ctx.teamId, influencerId: id, actorId: ctx.userId, type: "scored",
    detail: `Scored ${score.final_score} (${score.recommendation})`,
  });
  revalidatePath(`/influencers/${id}`);
  revalidatePath("/review");
  return score;
}

export async function updateInfluencerAction(id: string, patch: Record<string, unknown>) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  updateInfluencer(ctx, id, patch as any);
  revalidatePath(`/influencers/${id}`);
  revalidatePath("/influencers");
}

/**
 * Approve an influencer AND instantly produce a ready-to-send message:
 * status → approved, generate a personalized message, mark it approved_to_send,
 * so it appears immediately in the Send queue. One click = ready to reach out.
 */
export async function approveAndQueueAction(id: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");

  const inf = getInfluencer(ctx.teamId, id);
  setStatus(ctx, id, { status: "approved" });

  const kind = (inf.best_message_style as MessageKind) || "friendly";
  const msg = await generateAndSave(ctx, { influencerId: id, kind });
  setMessageState(ctx, msg.id, "approved_to_send");
  setStatus(ctx, id, { outreach_status: "approved_to_send" });
  logEvent({ teamId: ctx.teamId, influencerId: id, actorId: ctx.userId, type: "approved_for_outreach" });

  revalidatePath("/influencers");
  revalidatePath("/send-queue");
  revalidatePath("/pipeline");
  revalidatePath(`/influencers/${id}`);
  return { messageId: msg.id };
}

export async function setStatusAction(
  id: string, patch: { status?: InfluencerStatus; outreach_status?: OutreachStatus },
) {
  const ctx = requireSession();
  if (!can.updateStatus(ctx.role)) throw new Error("Not allowed");
  setStatus(ctx, id, patch);
  revalidatePath("/influencers");
  revalidatePath("/review");
  revalidatePath("/pipeline");
  revalidatePath(`/influencers/${id}`);
}

export async function deleteInfluencerAction(id: string) {
  const ctx = requireSession();
  if (!can.delete(ctx.role)) throw new Error("Not allowed");
  softDelete(ctx, id);
  revalidatePath("/influencers");
}

export async function restoreInfluencerAction(id: string) {
  const ctx = requireSession();
  if (!can.delete(ctx.role)) throw new Error("Not allowed");
  restore(ctx, id);
  revalidatePath("/influencers");
}

export async function addNoteAction(influencerId: string, body: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  addNote(ctx, influencerId, body);
  revalidatePath(`/influencers/${influencerId}`);
}

const s = (f: FormData, k: string) => { const v = f.get(k); return v ? String(v) : null; };
const n = (f: FormData, k: string) => {
  const v = f.get(k);
  return v ? Number(String(v).replace(/[, ]/g, "")) : null;
};
