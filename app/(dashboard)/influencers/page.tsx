import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listInfluencers } from "@/lib/services/influencers";
import { listCampaigns } from "@/lib/services/campaigns";
import { PageHeader } from "@/components/ui";
import { InfluencerFilters } from "@/components/InfluencerFilters";
import { AddInfluencer } from "@/components/AddInfluencer";
import { InfluencerTable } from "@/components/InfluencerTable";
import { PAGE_SIZE } from "@/lib/constants";
import type { FilterParams } from "@/lib/types";

export default function InfluencersPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const ctx = requireSession();
  const view = (searchParams.view as FilterParams["view"]) ?? "review";

  const filters: FilterParams = {
    q: searchParams.q,
    view,
    country: searchParams.country,
    city: searchParams.city,
    category: searchParams.category,
    product_focus: searchParams.product_focus,
    status: searchParams.status as any,
    outreach_status: searchParams.outreach_status as any,
    language: searchParams.language,
    campaign_id: searchParams.campaign_id,
    follower_min: searchParams.follower_min ? Number(searchParams.follower_min) : undefined,
    follower_max: searchParams.follower_max ? Number(searchParams.follower_max) : undefined,
    score_min: searchParams.score_min ? Number(searchParams.score_min) : undefined,
    sort: searchParams.sort,
    page: searchParams.page ? Number(searchParams.page) : 1,
  };

  const { rows, count } = listInfluencers(ctx.teamId, filters);
  const campaigns = listCampaigns(ctx.teamId);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const page = filters.page ?? 1;

  const TABS: { value: NonNullable<FilterParams["view"]>; label: string }[] = [
    { value: "review", label: "To review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Declined" },
    { value: "all", label: "All" },
  ];
  const tabHref = (v: string) => {
    const p = new URLSearchParams(Object.entries(searchParams).filter(([, x]) => x) as [string, string][]);
    p.set("view", v); p.delete("page");
    return `/influencers?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader title="Influencers" subtitle={`${count} in ${TABS.find((t) => t.value === view)?.label.toLowerCase()}`}
        action={<AddInfluencer campaigns={campaigns} role={ctx.role} />} />

      {/* View tabs — approved influencers move out of "To review" so you can't double-approve */}
      <div className="flex gap-1 mb-3">
        {TABS.map((t) => (
          <Link key={t.value} href={tabHref(t.value)}
            className={"text-sm px-3 py-1.5 rounded-lg border transition " +
              (view === t.value
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-ink-600 border-slate-200 hover:bg-slate-50")}>
            {t.label}
          </Link>
        ))}
      </div>

      <InfluencerFilters campaigns={campaigns} current={searchParams} />

      <InfluencerTable key={JSON.stringify(searchParams)} initial={rows} role={ctx.role} view={view} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-ink-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <PageLink page={page - 1} disabled={page <= 1} sp={searchParams} label="Previous" />
            <PageLink page={page + 1} disabled={page >= totalPages} sp={searchParams} label="Next" />
          </div>
        </div>
      )}
    </div>
  );
}

function PageLink({ page, disabled, sp, label }: {
  page: number; disabled: boolean; sp: Record<string, string | undefined>; label: string;
}) {
  if (disabled) return <span className="btn-ghost opacity-40 cursor-not-allowed">{label}</span>;
  const params = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  params.set("page", String(page));
  return <Link href={`/influencers?${params.toString()}`} className="btn-ghost">{label}</Link>;
}
