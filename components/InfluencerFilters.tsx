"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Campaign } from "@/lib/types";
import { INFLUENCER_STATUSES, OUTREACH_STATUSES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

export function InfluencerFilters({
  campaigns, current,
}: {
  campaigns: Campaign[];
  current: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [state, setState] = useState(current);

  function apply(patch: Record<string, string>) {
    const next = { ...state, ...patch, page: "1" };
    setState(next);
    const params = new URLSearchParams(
      Object.entries(next).filter(([, v]) => v) as [string, string][],
    );
    router.push(`/influencers?${params.toString()}`);
  }

  return (
    <div className="card p-3 grid grid-cols-2 md:grid-cols-6 gap-2">
      <input className="input col-span-2" placeholder="Search name / @username"
        defaultValue={current.q}
        onKeyDown={(e) => { if (e.key === "Enter") apply({ q: (e.target as HTMLInputElement).value }); }} />

      <input className="input" placeholder="Product fit" defaultValue={current.product_focus}
        onKeyDown={(e) => { if (e.key === "Enter") apply({ product_focus: (e.target as HTMLInputElement).value }); }} />

      <select className="input" defaultValue={current.status ?? ""}
        onChange={(e) => apply({ status: e.target.value })}>
        <option value="">Any status</option>
        {INFLUENCER_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
      </select>

      <select className="input" defaultValue={current.outreach_status ?? ""}
        onChange={(e) => apply({ outreach_status: e.target.value })}>
        <option value="">Any outreach</option>
        {OUTREACH_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
      </select>

      <select className="input" defaultValue={current.campaign_id ?? ""}
        onChange={(e) => apply({ campaign_id: e.target.value })}>
        <option value="">Any campaign</option>
        {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <input className="input" placeholder="Min followers" type="number"
        defaultValue={current.follower_min}
        onKeyDown={(e) => { if (e.key === "Enter") apply({ follower_min: (e.target as HTMLInputElement).value }); }} />
      <input className="input" placeholder="Max followers" type="number"
        defaultValue={current.follower_max}
        onKeyDown={(e) => { if (e.key === "Enter") apply({ follower_max: (e.target as HTMLInputElement).value }); }} />
      <input className="input" placeholder="Min score" type="number"
        defaultValue={current.score_min}
        onKeyDown={(e) => { if (e.key === "Enter") apply({ score_min: (e.target as HTMLInputElement).value }); }} />

      <select className="input" defaultValue={current.sort ?? "final_score.desc"}
        onChange={(e) => apply({ sort: e.target.value })}>
        <option value="final_score.desc">Score ↓</option>
        <option value="final_score.asc">Score ↑</option>
        <option value="follower_count.desc">Followers ↓</option>
        <option value="created_at.desc">Newest</option>
      </select>

      <a href="/influencers" className="btn-ghost justify-center">Reset</a>
    </div>
  );
}
