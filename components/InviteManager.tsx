"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInviteAction, revokeInviteAction } from "@/app/actions/team";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import type { Invite, CompanySummary } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

const INVITABLE_ROLES: UserRole[] = ["admin", "sales_manager", "outreach_assistant", "viewer"];

export function InviteManager({
  invites, companies, currentTeamId,
}: {
  invites: Invite[];
  /** Only passed for the platform admin — lets them target a company other than the one they're viewing. */
  companies?: CompanySummary[];
  currentTeamId?: string;
}) {
  const [items, setItems] = useState(invites);
  const [role, setRole] = useState<UserRole>("outreach_assistant");
  const [email, setEmail] = useState("");
  const [targetTeam, setTargetTeam] = useState(currentTeamId ?? "");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function generate() {
    setError(null);
    setLink(null);
    start(async () => {
      try {
        const { token } = await createInviteAction(role, email, companies ? targetTeam : undefined);
        const url = `${window.location.origin}/invite/${token}`;
        setLink(url);
        // Only show it in this list if it's for the company currently being viewed.
        if (!companies || targetTeam === currentTeamId) {
          setItems((cur) => [
            { id: token, team_id: "", token, email: email || null, role, created_at: new Date().toISOString(), expires_at: null, accepted_at: null },
            ...cur,
          ]);
        }
        setEmail("");
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Failed to create invite");
      }
    });
  }

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function revoke(id: string) {
    setItems((cur) => cur.filter((i) => i.id !== id));
    start(async () => { await revokeInviteAction(id); router.refresh(); });
  }

  return (
    <div className="card p-4 space-y-3">
      <div>
        <h3 className="font-medium text-ink-900 text-sm">Invite a teammate</h3>
        <p className="text-xs text-ink-500">
          Generates a link — no email is sent, share it yourself (Slack, WhatsApp, email, however).
          Anyone with the link joins this team at the role you pick.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {companies && (
          <div>
            <label className="label">Company</label>
            <select className="input py-1.5 w-44" value={targetTeam} onChange={(e) => setTargetTeam(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label">Role</label>
          <select className="input py-1.5 w-40" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Email (optional)</label>
          <input className="input py-1.5 w-52" placeholder="teammate@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn-primary py-1.5" disabled={pending} onClick={generate}>
          {pending ? "Generating…" : "Generate invite link"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {link && (
        <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
          <input readOnly value={link} className="input py-1 text-xs bg-white" onFocus={(e) => e.target.select()} />
          <button className="btn-ghost py-1 text-xs shrink-0" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
        </div>
      )}

      {items.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-medium text-ink-500 mb-2">Pending invites</p>
          <div className="space-y-1.5">
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between text-xs gap-2">
                <span className="text-ink-700 truncate">
                  {i.email || "(no email set)"} · {ROLE_LABELS[i.role]} · {formatDate(i.created_at)}
                </span>
                <button className="btn-ghost py-0.5 px-2 text-xs text-red-600 shrink-0" disabled={pending}
                  onClick={() => revoke(i.id)}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
