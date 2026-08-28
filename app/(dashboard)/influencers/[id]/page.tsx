import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getInfluencer, listNotes, listEvents } from "@/lib/services/influencers";
import { listMessages } from "@/lib/services/messages";
import { Avatar, ScoreBadge, StatusBadge, PageHeader } from "@/components/ui";
import { DecisionButtons } from "@/components/DecisionButtons";
import { MessageStudio } from "@/components/MessageStudio";
import { NotesPanel } from "@/components/NotesPanel";
import { formatNumber, formatPct, formatDate, titleCase } from "@/lib/utils";

export default function InfluencerDetail({ params }: { params: { id: string } }) {
  const ctx = requireSession();
  const inf = getInfluencer(ctx.teamId, params.id);
  const messages = listMessages(ctx.teamId, params.id);
  const notes = listNotes(params.id);
  const events = listEvents(params.id);

  const isTikTok = /tik/i.test(inf.platform ?? "");
  const profileHref = inf.profile_url
    ?? (isTikTok
      ? `https://www.tiktok.com/@${inf.instagram_username}`
      : `https://instagram.com/${inf.instagram_username}`);

  return (
    <div>
      <PageHeader
        title={inf.full_name ?? inf.instagram_username}
        subtitle={`@${inf.instagram_username}`}
        action={<a href={profileHref}
          target="_blank" rel="noreferrer" className="btn-ghost">
          {isTikTok ? "Open TikTok ↗" : "Open Instagram ↗"}
        </a>}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <Avatar src={inf.profile_picture_url} name={inf.full_name ?? inf.instagram_username} size={56} />
              <div>
                <div className="font-semibold text-ink-900">{inf.full_name ?? inf.instagram_username}</div>
                <div className="text-sm text-ink-500">{[inf.city, inf.country].filter(Boolean).join(", ")}</div>
                <div className="mt-1 flex gap-1"><StatusBadge status={inf.status} /><StatusBadge status={inf.outreach_status} /></div>
              </div>
            </div>
            {inf.bio && <p className="text-sm text-ink-700 mt-3">{inf.bio}</p>}
            <dl className="grid grid-cols-2 gap-2 mt-4 text-sm">
              <Metric label="Followers" value={formatNumber(inf.follower_count)} />
              <Metric label="Following" value={formatNumber(inf.following_count)} />
              <Metric label="Posts" value={formatNumber(inf.post_count)} />
              <Metric label="Engagement" value={formatPct(inf.engagement_rate)} />
              <Metric label="Avg likes" value={formatNumber(inf.avg_likes)} />
              <Metric label="Avg comments" value={formatNumber(inf.avg_comments)} />
            </dl>
            <div className="mt-4 text-sm space-y-1">
              <Row k="Email" v={inf.email} />
              <Row k="WhatsApp" v={inf.whatsapp} />
              <Row k="Website" v={inf.website} />
              <Row k="Language" v={inf.language} />
              <Row k="Platform" v={isTikTok ? "TikTok" : "Instagram"} />
              <Row k="Category" v={titleCase(inf.category ?? "")} />
              <Row k="Source" v={titleCase(inf.source)} />
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-3">Scores</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ScoreRow label="Final" score={inf.final_score} />
              <ScoreRow label="Brand fit" score={inf.brand_fit_score} />
              <ScoreRow label="Engagement" score={inf.engagement_score} />
              <ScoreRow label="Quality" score={inf.quality_score} />
              <ScoreRow label="Risk" score={inf.risk_score} />
            </div>
            {inf.ai_recommendation && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                <div className="font-medium">AI recommendation: <span className="uppercase">{inf.ai_recommendation}</span></div>
                {inf.ai_reasoning && <p className="text-ink-700 mt-1">{inf.ai_reasoning}</p>}
                {inf.best_product_angle && <p className="text-ink-500 mt-1">Angle: {inf.best_product_angle}</p>}
                {inf.risk_warning && <p className="text-amber-700 mt-1">⚠ {inf.risk_warning}</p>}
              </div>
            )}
          </div>

          <DecisionButtons influencer={inf} role={ctx.role} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <MessageStudio influencerId={inf.id} messages={messages} role={ctx.role}
            defaultKind={(inf.best_message_style as any) ?? "friendly"} />

          <NotesPanel influencerId={inf.id} notes={notes} role={ctx.role} />

          <div className="card p-5">
            <h2 className="font-semibold mb-3">Activity timeline</h2>
            <ol className="relative border-l border-slate-200 ml-2 space-y-3">
              {events.map((e: any) => (
                <li key={e.id} className="ml-4">
                  <div className="absolute -left-[5px] w-2.5 h-2.5 bg-brand-400 rounded-full mt-1.5" />
                  <div className="text-sm text-ink-800">{titleCase(e.type)}{e.detail ? `: ${e.detail}` : ""}</div>
                  <div className="text-xs text-ink-500">{formatDate(e.created_at)}</div>
                </li>
              ))}
              {events.length === 0 && <li className="ml-4 text-sm text-ink-500">No activity yet.</li>}
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/influencers" className="text-sm text-brand-700 hover:underline">← Back to influencers</Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-ink-500">{label}</div><div className="font-medium">{value}</div></div>;
}
function Row({ k, v }: { k: string; v?: string | null }) {
  return <div className="flex gap-2"><span className="text-ink-500 w-20 shrink-0">{k}</span><span className="text-ink-800 truncate">{v || "—"}</span></div>;
}
function ScoreRow({ label, score }: { label: string; score: number | null }) {
  return <div className="flex items-center justify-between"><span className="text-ink-500">{label}</span><ScoreBadge score={score} /></div>;
}
