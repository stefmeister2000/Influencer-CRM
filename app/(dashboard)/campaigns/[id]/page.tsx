import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getCampaign } from "@/lib/services/campaigns";
import { countByCampaign } from "@/lib/services/influencers";
import { PageHeader, StatCard } from "@/components/ui";
import { titleCase } from "@/lib/utils";
import { RunDiscoveryButton } from "@/components/RunDiscoveryButton";
import { CampaignEditor } from "@/components/CampaignEditor";
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
        <StatCard label="Payout" value={campaign.affiliate_payout ?? "—"} />
        <StatCard label="Goal" value={campaign.outreach_goal ?? "—"} />
      </div>

      <CampaignEditor campaign={campaign} filters={filters} />
    </div>
  );
}
