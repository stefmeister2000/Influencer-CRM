import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listCampaigns } from "@/lib/services/campaigns";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { SectionTabs } from "@/components/SectionTabs";
import { DeleteCampaignButton } from "@/components/DeleteCampaignButton";
import { can } from "@/lib/permissions";
import { formatDate, titleCase } from "@/lib/utils";

export default function CampaignsPage() {
  const ctx = requireSession();
  const campaigns = listCampaigns(ctx.teamId);

  return (
    <div>
      <SectionTabs />
      <PageHeader title="Campaigns" subtitle="Each campaign is a discovery + outreach effort"
        action={<Link href="/discovery" className="btn-primary">New via discovery</Link>} />

      {campaigns.length === 0 ? (
        <EmptyState title="No campaigns yet" hint="Start one from the Discovery page." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-ink-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Payout</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/campaigns/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{titleCase(c.product_focus ?? "")}</td>
                  <td className="px-4 py-3">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3">{c.affiliate_payout ? `€${c.affiliate_payout}` : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-ink-500">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {can.delete(ctx.role) && <DeleteCampaignButton id={c.id} name={c.name} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
