import type { Campaign, DiscoveryFilters } from "../types";
import { getProvider } from "../providers/manual";
import { normalizeProfileData } from "../providers/types";
import { scoreInfluencer } from "../ai/scoring";
import { upsertInfluencer } from "./influencers";
import { getBusinessContext } from "./business";

interface Ctx { teamId: string; userId: string; }

export interface DiscoveryRunResult { found: number; inserted: number; skipped: number; }

/**
 * Run discovery for a campaign: provider search → normalize → score → insert
 * into the review queue. The default ManualProvider returns nothing (compliant);
 * rows appear only with an approved provider configured, or via manual/CSV.
 */
export async function runDiscovery(
  ctx: Ctx, campaign: Campaign, limit = 50,
): Promise<DiscoveryRunResult> {
  const filters = campaign.parsed_filters as DiscoveryFilters | null;
  if (!filters) return { found: 0, inserted: 0, skipped: 0 };

  const businessContext = getBusinessContext(ctx.teamId);
  const provider = getProvider();
  const raw = await provider.searchProfiles(filters, limit, businessContext);

  let inserted = 0, skipped = 0;
  for (const r of raw) {
    const profile = normalizeProfileData(r);
    const score = await scoreInfluencer(profile, filters, businessContext);
    const { outcome } = upsertInfluencer(ctx, {
      ...profile,
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
      country: profile.country ?? filters.country,
    }, {
      campaignId: campaign.id, strategy: "skip", status: "needs_review",
      dedupeIncludeDeleted: true, // never resurface someone already seen/declined/deleted
    });
    if (outcome === "inserted") inserted++; else skipped++;
  }

  return { found: raw.length, inserted, skipped };
}
