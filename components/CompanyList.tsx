"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCompanyAction, switchCompanyAction } from "@/app/actions/team";
import type { CompanySummary } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export function CompanyList({ companies, currentTeamId }: { companies: CompanySummary[]; currentTeamId: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function create() {
    const clean = name.trim();
    if (!clean) return;
    setError(null);
    start(async () => {
      try {
        await createCompanyAction(clean);
        setName("");
        router.refresh(); // re-renders this page with the fresh company list from the server
      } catch (e: any) {
        setError(e?.message ?? "Failed to create company");
      }
    });
  }

  function switchTo(teamId: string | null) {
    start(async () => { await switchCompanyAction(teamId); router.push("/dashboard"); router.refresh(); });
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="font-medium text-ink-900 text-sm mb-1">Create a new company</h3>
        <p className="text-xs text-ink-500 mb-2">
          Spins up a fresh company with its own business profile, knowledge base, brand color,
          categories, campaigns and influencers — completely separate from every other one here.
        </p>
        <div className="flex items-center gap-2">
          <input className="input max-w-sm" placeholder="e.g. Acme Skincare"
            value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={pending || !name.trim()} onClick={create}>
            {pending ? "Creating…" : "Create company"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Company</th>
              <th className="text-left px-4 py-2.5">Members</th>
              <th className="text-left px-4 py-2.5">Influencers</th>
              <th className="text-left px-4 py-2.5">Created</th>
              <th className="text-right px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((c) => {
              const isCurrent = c.id === currentTeamId;
              return (
                <tr key={c.id} className={isCurrent ? "bg-brand-50/50" : ""}>
                  <td className="px-4 py-2.5 font-medium text-ink-900">
                    {c.name}
                    {isCurrent && <span className="badge bg-brand-100 text-brand-700 ml-2">Currently viewing</span>}
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{c.member_count}</td>
                  <td className="px-4 py-2.5 text-ink-600">{c.influencer_count}</td>
                  <td className="px-4 py-2.5 text-ink-500">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {!isCurrent && (
                      <button className="btn-ghost py-1 text-xs" disabled={pending} onClick={() => switchTo(c.id)}>
                        Switch to this company
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
