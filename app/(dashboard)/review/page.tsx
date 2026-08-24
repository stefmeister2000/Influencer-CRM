import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listInfluencers } from "@/lib/services/influencers";
import { PageHeader, Avatar, ScoreBadge, EmptyState } from "@/components/ui";
import { RowActions } from "@/components/RowActions";
import { formatNumber, formatPct, titleCase } from "@/lib/utils";

export default function ReviewPage() {
  const ctx = requireSession();
  const { rows } = listInfluencers(ctx.teamId, { status: "needs_review", sort: "final_score.desc" });

  return (
    <div>
      <PageHeader title="Review queue" subtitle={`${rows.length} profiles awaiting human review`} />
      {rows.length === 0 ? (
        <EmptyState title="Nothing to review" hint="Discovered and imported profiles land here first." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((i) => (
            <div key={i.id} className="card p-4">
              <div className="flex items-start gap-3">
                <Avatar src={i.profile_picture_url} name={i.full_name ?? i.instagram_username} size={48} />
                <div className="flex-1 min-w-0">
                  <Link href={`/influencers/${i.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                    {i.full_name ?? i.instagram_username}
                  </Link>
                  <div className="text-xs text-ink-500">@{i.instagram_username} · {[i.city, i.country].filter(Boolean).join(", ")}</div>
                  <div className="text-xs text-ink-600 mt-1">
                    {formatNumber(i.follower_count)} followers · {formatPct(i.engagement_rate)} eng · {titleCase(i.category ?? "")}
                  </div>
                  {i.ai_reasoning && <p className="text-xs text-ink-500 mt-1 line-clamp-2">{i.ai_reasoning}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ScoreBadge score={i.final_score} label="final score" />
                  <RowActions influencer={i} role={ctx.role} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
