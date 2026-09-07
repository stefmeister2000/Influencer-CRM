"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCompanyAction, switchCompanyAction, renameTeamAction } from "@/app/actions/team";
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
                    <CompanyNameCell id={c.id} name={c.name} isCurrent={isCurrent} />
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

/** Click a company's name to rename it right here — no need to switch into it first. */
function CompanyNameCell({ id, name, isCurrent }: { id: string; name: string; isCurrent: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    const clean = value.trim();
    if (!clean || clean === name) { setEditing(false); setValue(name); return; }
    start(async () => {
      await renameTeamAction(clean, id);
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        {name}
        {isCurrent && <span className="badge bg-brand-100 text-brand-700">Currently viewing</span>}
        <button type="button" className="text-xs text-ink-400 hover:text-brand-700 underline"
          onClick={() => { setValue(name); setEditing(true); }}>
          Rename
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        autoFocus
        className="input py-1 text-sm w-44"
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") { setEditing(false); setValue(name); }
        }}
      />
      <button className="btn-primary py-1 px-2 text-xs" disabled={pending} onClick={save}>
        {pending ? "…" : "Save"}
      </button>
      <button className="btn-ghost py-1 px-2 text-xs" disabled={pending}
        onClick={() => { setEditing(false); setValue(name); }}>
        Cancel
      </button>
    </span>
  );
}
