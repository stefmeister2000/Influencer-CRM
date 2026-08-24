import { askJSON, aiConfigured } from "./anthropic";
import { ruleBasedScore } from "../scoring/ruleBased";
import type { DiscoveryFilters, Influencer, ScoringResult } from "../types";

const SYSTEM_BASE = `You are an influencer evaluation analyst for a business
(described below). Given a creator's public profile data and the campaign filters,
assess how good a fit they are for THIS business's outreach. Be realistic and
commercial: an engaged micro/mid creator (roughly 5k-100k) in an aligned niche and
market scores high; a global celebrity scores lower (expensive, less reachable);
risky/explicit or fake-engagement profiles score low.

Return JSON EXACTLY:
{
  "brand_fit_score": 0-100,
  "engagement_score": 0-100,
  "quality_score": 0-100,
  "risk_score": 0-100,          // higher = riskier
  "final_score": 0-100,
  "product_fit": string,        // which of the business's products/services this creator best suits
  "recommendation": "yes"|"no"|"maybe",
  "reasoning": string,          // 1-2 sentences, concrete
  "best_product_angle": string,
  "best_message_style": "friendly"|"premium"|"direct"|"less_salesy"|"short_dm"|"whatsapp"|"long_email",
  "risk_warning": string,       // empty if none
  "suggested_categories": string[]
}
Use only the provided data. Do not invent metrics.`;

/**
 * Score a profile. Always computes a deterministic rule-based baseline; if an
 * API key is present, asks Claude and blends (70% AI, 30% rules) for stability.
 */
export async function scoreInfluencer(
  inf: Partial<Influencer>,
  filters?: DiscoveryFilters | null,
  businessContext?: string,
): Promise<ScoringResult> {
  const rules = ruleBasedScore(inf, filters);

  if (!aiConfigured()) {
    return {
      ...rules,
      product_fit: filters?.product_focus ?? inf.product_fit ?? "",
      recommendation: rules.final_score >= 60 ? "yes" : rules.final_score >= 40 ? "maybe" : "no",
      reasoning: "Rule-based score (AI not configured).",
      best_product_angle: filters?.message_angle ?? "partnership fit",
      best_message_style: "friendly",
      risk_warning: rules.risk_score >= 50 ? "Elevated risk score from rules." : "",
      suggested_categories: filters?.categories ?? [],
    };
  }

  const ai = await askJSON<ScoringResult>({
    system: businessContext ? `${SYSTEM_BASE}\n\n--- BUSINESS CONTEXT ---\n${businessContext}` : SYSTEM_BASE,
    user: JSON.stringify({ profile: slim(inf), filters }, null, 2),
    maxTokens: 700,
  });

  const blend = (a: number, b: number) => Math.round(a * 0.7 + b * 0.3);
  return {
    brand_fit_score: blend(num(ai.brand_fit_score), rules.brand_fit_score),
    engagement_score: blend(num(ai.engagement_score), rules.engagement_score),
    quality_score: blend(num(ai.quality_score), rules.quality_score),
    risk_score: blend(num(ai.risk_score), rules.risk_score),
    final_score: blend(num(ai.final_score) || rules.final_score, rules.final_score),
    product_fit: ai.product_fit || filters?.product_focus || "",
    recommendation: ai.recommendation || "maybe",
    reasoning: ai.reasoning || "",
    best_product_angle: ai.best_product_angle || filters?.message_angle || "",
    best_message_style: ai.best_message_style || "friendly",
    risk_warning: ai.risk_warning || "",
    suggested_categories: ai.suggested_categories || [],
  };
}

const num = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

function slim(inf: Partial<Influencer>) {
  return {
    username: inf.instagram_username,
    full_name: inf.full_name,
    bio: inf.bio,
    follower_count: inf.follower_count,
    following_count: inf.following_count,
    post_count: inf.post_count,
    avg_likes: inf.avg_likes,
    avg_comments: inf.avg_comments,
    engagement_rate: inf.engagement_rate,
    country: inf.country,
    city: inf.city,
    language: inf.language,
    category: inf.category,
    has_contact: Boolean(inf.email || inf.whatsapp),
  };
}
