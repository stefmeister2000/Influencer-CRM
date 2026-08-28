"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  approveAndQueueAction, deleteInfluencerAction, setStatusAction, scoreInfluencerAction,
} from "@/app/actions/influencers";
import { Avatar, StatusBadge, ScoreBadge } from "@/components/ui";
import { HandleActions } from "@/components/HandleActions";
import { formatNumber, formatPct, titleCase } from "@/lib/utils";
import type { Influencer, UserRole, FilterParams } from "@/lib/types";
import { can } from "@/lib/permissions";

const shortCountry = (c?: string | null) => {
  if (!c) return "";
  if (/united arab emirates/i.test(c)) return "UAE";
  if (/netherlands|nederland/i.test(c)) return "NL";
  if (/belgium|belgi[eë]/i.test(c)) return "BE";
  return c;
};

/**
 * Compact, fixed-width influencer table with OPTIMISTIC actions. Delete removes
 * the row instantly; approve moves it out of the "To review" view (so you can't
 * accidentally approve twice). Server actions run in the background — no lag.
 */
export function InfluencerTable({
  initial, role, view = "all",
}: {
  initial: Influencer[]; role: UserRole; view?: FilterParams["view"];
}) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [, start] = useTransition();
  const writable = can.write(role);
  const deletable = can.delete(role);

  const patchRow = (id: string, patch: Partial<Influencer>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id));
  const setRowBusy = (id: string, v: boolean) => setBusy((b) => ({ ...b, [id]: v }));

  function del(id: string, username: string) {
    if (!confirm(`Delete @${username}?`)) return;
    removeRow(id);
    start(() => { deleteInfluencerAction(id); });
  }
  function reject(id: string) {
    if (view === "review" || view === "approved") removeRow(id);
    else patchRow(id, { status: "rejected" });
    start(() => { setStatusAction(id, { status: "rejected" }); });
  }
  function approve(id: string) {
    setRowBusy(id, true);
    start(async () => {
      await approveAndQueueAction(id);
      // In the review view, approved profiles move to the "Approved" tab.
      if (view === "review") removeRow(id);
      else patchRow(id, { status: "approved", outreach_status: "approved_to_send" });
      setRowBusy(id, false);
    });
  }
  function rescore(id: string) {
    setRowBusy(id, true);
    start(async () => {
      const s = await scoreInfluencerAction(id);
      patchRow(id, {
        final_score: s.final_score, brand_fit_score: s.brand_fit_score,
        engagement_score: s.engagement_score, quality_score: s.quality_score,
        risk_score: s.risk_score, product_fit: s.product_fit,
      });
      setRowBusy(id, false);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="card p-10 text-center mt-1">
        <p className="text-ink-700 font-medium">Nothing here</p>
        <p className="text-sm text-ink-500 mt-1">
          {view === "review"
            ? "No profiles waiting for review. Run discovery or add some."
            : "Adjust filters, add manually, or import a CSV."}
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden mt-1">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col style={{ width: "25%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "14%" }} />
        </colgroup>
        <thead className="bg-slate-50 text-ink-500 text-xs uppercase">
          <tr>
            <th className="text-left px-3 py-2.5">Creator</th>
            <th className="text-left px-2 py-2.5">Location</th>
            <th className="text-left px-2 py-2.5">Category</th>
            <th className="text-right px-2 py-2.5">Followers</th>
            <th className="text-right px-2 py-2.5">Eng.</th>
            <th className="text-center px-2 py-2.5">Fit</th>
            <th className="text-center px-2 py-2.5">Score</th>
            <th className="text-left px-2 py-2.5">Outreach</th>
            <th className="text-right px-2 py-2.5">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 align-middle">
          {rows.map((i) => {
            const isBusy = busy[i.id];
            const approved = i.outreach_status === "approved_to_send" || i.outreach_status === "sent";
            return (
              <tr key={i.id} className={"hover:bg-slate-50 " + (isBusy ? "opacity-60" : "")}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Link href={`/influencers/${i.id}`} className="shrink-0">
                      <Avatar src={i.profile_picture_url} name={i.full_name ?? i.instagram_username} size={32} />
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/influencers/${i.id}`}
                        className="font-medium text-ink-900 hover:text-brand-700 truncate block">
                        {i.full_name ?? i.instagram_username}
                      </Link>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-ink-500 truncate">@{i.instagram_username}</span>
                        <span className="badge bg-slate-100 text-slate-600 text-[10px] uppercase">
                          {/tik/i.test(i.platform ?? "") ? "TikTok" : "IG"}
                        </span>
                        <HandleActions username={i.instagram_username} platform={i.platform} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-ink-700 truncate">{[i.city, shortCountry(i.country)].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-2 py-2.5 text-ink-700 truncate">{titleCase(i.category ?? "")}</td>
                <td className="px-2 py-2.5 text-right whitespace-nowrap">{formatNumber(i.follower_count)}</td>
                <td className="px-2 py-2.5 text-right whitespace-nowrap">{formatPct(i.engagement_rate)}</td>
                <td className="px-2 py-2.5 text-center truncate">{titleCase(i.product_fit ?? "")}</td>
                <td className="px-2 py-2.5 text-center"><ScoreBadge score={i.final_score} /></td>
                <td className="px-2 py-2.5">
                  {i.status === "rejected"
                    ? <span className="badge bg-red-100 text-red-700">Declined</span>
                    : i.status === "not_interested"
                      ? <span className="badge bg-slate-200 text-slate-600">Not interested</span>
                      : <StatusBadge status={i.outreach_status} />}
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {!approved && (
                      <button title="Approve → message → send queue"
                        className="btn-primary px-2 py-1 text-xs" disabled={isBusy || !writable}
                        onClick={() => approve(i.id)}>
                        {isBusy ? "…" : "Approve"}
                      </button>
                    )}
                    <button title="Re-score" className="btn-ghost px-1.5 py-1 text-xs"
                      disabled={isBusy || !writable} onClick={() => rescore(i.id)}>★</button>
                    {i.status !== "rejected" && (
                      <button title="Reject" className="btn-ghost px-1.5 py-1 text-xs text-amber-700"
                        disabled={isBusy || !writable} onClick={() => reject(i.id)}>✕</button>
                    )}
                    {deletable && (
                      <button title="Delete" className="btn-ghost px-1.5 py-1 text-xs text-red-600"
                        disabled={isBusy} onClick={() => del(i.id, i.instagram_username)}>🗑</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
