import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getCampaign } from "@/lib/services/campaigns";
import { countByCampaign } from "@/lib/services/influencers";
import { PageHeader, StatCard } from "@/components/ui";
import { titleCase } from "@/lib/utils";
import { RunDiscoveryButton } from "@/components/RunDiscoveryButton";
import type { DiscoveryFilters } from "@/lib/types";

export default function CampaignDetail({ params }: { params: { id: string } }) {
  const ctx = requireSession();
  const campaign = getCampaign(ctx.teamId, params.id);
  const filters = campaign.parsed_filters as DiscoveryFilters | null;
  const count = countByCampaign(ctx.teamId, campaign.id);

  return (
    <div>
      <PageHeader title={campaign.name}
        subtitle={[titleCase(campaign.product_focus ?? ""), campaign.city, campaign.country].filter(Boolean).join(" · ")}
        action={<div className="flex gap-2">
          <RunDiscoveryButton campaignId={campaign.id} />
          <Link href={`/influencers?campaign_id=${campaign.id}`} className="btn-ghost">View influencers</Link>
        </div>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Status" value={titleCase(campaign.status)} />
        <StatCard label="Influencers" value={count} />
        <StatCard label="Payout" value={campaign.affiliate_payout ? `AED ${campaign.affiliate_payout}` : "—"} />
        <StatCard label="Goal" value={campaign.outreach_goal ?? "—"} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-2">Search prompt</h2>
          <p className="text-sm text-ink-700 whitespace-pre-wrap">{campaign.search_prompt ?? "—"}</p>
          {campaign.brand_voice && (
            <>
              <h3 className="font-medium mt-4 mb-1 text-sm">Brand voice</h3>
              <p className="text-sm text-ink-700">{campaign.brand_voice}</p>
            </>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-2">Parsed filters</h2>
          {filters ? (
            <dl className="text-sm space-y-1">
              <Row k="Cities" v={filters.cities?.join(", ")} />
              <Row k="Categories" v={filters.categories?.join(", ")} />
              <Row k="Followers" v={`${filters.follower_min}–${filters.follower_max}`} />
              <Row k="Languages" v={filters.languages?.join(", ")} />
              <Row k="Exclude" v={(filters.exclude ?? filters.excluded_niches)?.join(", ")} />
              <Row k="Message angle" v={filters.message_angle} />
            </dl>
          ) : <p className="text-sm text-ink-500">No parsed filters.</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-ink-500 w-28 shrink-0">{k}</dt>
      <dd className="text-ink-800">{v || "—"}</dd>
    </div>
  );
}
