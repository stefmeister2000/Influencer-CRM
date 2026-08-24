"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRoleAction } from "@/app/actions/team";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

type Member = { id: string; email: string; full_name: string | null; role: UserRole };

export function RoleManager({ members, canEdit }: { members: Member[]; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-ink-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-3">Member</th>
            <th className="text-left px-4 py-3">Email</th>
            <th className="text-left px-4 py-3">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-3 font-medium">{m.full_name ?? "—"}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
