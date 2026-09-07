"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameTeamAction } from "@/app/actions/team";

/** Admin-only: the company/team's own name (distinct from the marketing "Business name" below). */
export function TeamNameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="card p-4">
      <h3 className="font-medium text-ink-900 text-sm mb-1">Company name</h3>
      <p className="text-xs text-ink-500 mb-2">
        The name of your organization in this software (separate from the public-facing
        "Business name" in your Business profile below).
      </p>
      <div className="flex items-center gap-2">
        <input className="input" value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        <button className="btn-primary shrink-0" disabled={pending || !name.trim()}
          onClick={() => start(async () => {
            await renameTeamAction(name);
            setSaved(true);
            router.refresh();
          })}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {saved && <p className="text-xs text-emerald-700 mt-1">Saved ✓</p>}
    </div>
  );
}
