import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/services/metrics";
import { getBusinessProfile, isBusinessConfigured } from "@/lib/services/business";
import { StatCard, PageHeader } from "@/components/ui";
import { titleCase } from "@/lib/utils";

export default function DashboardPage() {
  const ctx = requireSession();
  const m = getDashboardMetrics(ctx.teamId);
  const configured = isBusinessConfigured(ctx.teamId);
  const business = getBusinessProfile(ctx.teamId);

  return (
    <div>
      <PageHeader
        title={configured ? (business.name || "Dashboard") : `Welcome${ctx.fullName ? ", " + ctx.fullName.split(" ")[0] : ""}`}
        subtitle={configured ? "Outreach pipeline at a glance" : "Let's set up your business"}
        action={<Link href="/discovery" className="btn-primary">New discovery</Link>}
      />

      {!configured && (
        <div className="card p-5 mb-4 border-brand-200 bg-brand-50">
          <h2 className="font-semibold text-ink-900">Start here — set up your business</h2>
          <p className="text-sm text-ink-700 mt-1">
            Tell the tool who you're doing outreach for (website, Instagram, what you sell, your offer).
            The AI then finds creators, scores fit, and writes messages specifically for your business.
          </p>
          <Link href="/settings" className="btn-primary mt-3 inline-flex">Set up business profile</Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total influencers" value={m.total} />
        <StatCard label="Approved" value={m.approved} />
        <StatCard label="Messages generated" value={m.messagesGenerated} />
        <StatCard label="Messages approved" value={m.messagesApproved} />
        <StatCard label="Messages sent" value={m.messagesSent} />
        <StatCard label="Replies" value={m.replies} />
        <StatCard label="Interested" value={m.interested} />
        <StatCard label="Onboarded affiliates" value={m.onboarded} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <StatCard label="Conversion rate" value={`${m.conversionRate}%`} hint="onboarded / sent" />
        <StatCard label="Average score" value={m.avgScore} />
        <StatCard label="Best category" value={m.bestCategory ? titleCase(m.bestCategory) : "—"} />
      </div>

      <div className="card p-5 mt-5">
        <h2 className="font-semibold text-ink-900 mb-2">How it works</h2>
        <ul className="text-sm text-ink-700 space-y-1 list-disc list-inside">
          <li>Discovery finds real public creators that fit your business (results go to review).</li>
          <li>Approve a creator → an on-brand message is generated and queued.</li>
          <li>Every message is human-reviewed before you send it — copy the handle, open IG/WhatsApp, send.</li>
          <li>Decline or delete people once; discovery never resurfaces them.</li>
        </ul>
      </div>
    </div>
  );
}
