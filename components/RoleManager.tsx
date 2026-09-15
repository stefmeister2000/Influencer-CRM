"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRoleAction, removeMemberAction } from "@/app/actions/team";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

type Member = { id: string; email: string; full_name: string | null; role: UserRole };

export function RoleManager({
  members, canEdit, currentUserId,
}: { members: Member[]; canEdit: boolean; currentUserId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const router = useRouter();

  function remove(id: string) {
    setError(null);
    start(async () => {
      try {
        await removeMemberAction(id);
        setConfirmingId(null);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Failed to remove teammate");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Member</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              {canEdit && <th className="text-right px-4 py-3">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-medium">
                  {m.full_name ?? "—"} {m.id === currentUserId && <span className="text-ink-400">(you)</span>}
                </td>
                <td className="px-4 py-3 text-ink-600">{m.email}</td>
                <td className="px-4 py-3">
                  {canEdit ? (
                    <select className="input py-1.5 w-48" defaultValue={m.role} disabled={pending}
                      onChange={(e) => start(async () => { await updateRoleAction(m.id, e.target.value as UserRole); router.refresh(); })}>
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{ROLE_LABELS[m.role]}</span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    {m.id !== currentUserId && (
                      confirmingId === m.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-ink-500">Remove {m.full_name || m.email}?</span>
                          <button type="button" className="text-xs text-red-600 hover:text-red-700 font-medium underline"
                            disabled={pending} onClick={() => remove(m.id)}>
                            {pending ? "…" : "Confirm"}
                          </button>
                          <button type="button" className="text-xs text-ink-400 hover:text-ink-600 underline"
                            disabled={pending} onClick={() => setConfirmingId(null)}>
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button type="button" className="text-xs text-red-500 hover:text-red-700 underline"
                          onClick={() => setConfirmingId(m.id)}>
                          Remove
                        </button>
                      )
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
