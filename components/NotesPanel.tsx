"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNoteAction } from "@/app/actions/influencers";
import type { UserRole } from "@/lib/types";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

type Note = { id: string; body: string; created_at: string };

export function NotesPanel({ influencerId, notes, role }: {
  influencerId: string; notes: Note[]; role: UserRole;
}) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">Notes</h2>
      {can.write(role) && (
        <div className="flex gap-2 mb-3">
          <input className="input" placeholder="Add a note…" value={body}
            onChange={(e) => setBody(e.target.value)} />
          <button className="btn-primary" disabled={pending || !body.trim()}
            onClick={() => start(async () => { await addNoteAction(influencerId, body); setBody(""); router.refresh(); })}>
            Add
          </button>
        </div>
      )}
      <div className="space-y-2">
        {notes.length === 0 && <p className="text-sm text-ink-500">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="text-sm border-l-2 border-slate-200 pl-3">
            <div className="text-ink-800">{n.body}</div>
            <div className="text-xs text-ink-500">{formatDate(n.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
