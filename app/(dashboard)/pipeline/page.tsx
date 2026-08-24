import { requireSession } from "@/lib/auth";
import { listInfluencers } from "@/lib/services/influencers";
import { PageHeader } from "@/components/ui";
import { PipelineBoard } from "@/components/PipelineBoard";
import type { Influencer } from "@/lib/types";

export default function PipelinePage() {
  const ctx = requireSession();

  // Gather all live influencers across pages.
  let all: Influencer[] = [];
  let page = 1;
  while (true) {
    const { rows } = listInfluencers(ctx.teamId, { sort: "final_score.desc", page });
    if (!rows.length) break;
    all = all.concat(rows);
    if (rows.length < 25 || page > 40) break;
    page++;
  }

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Drag a card between stages to update its status." />
      <PipelineBoard initial={all} />
    </div>
  );
}
