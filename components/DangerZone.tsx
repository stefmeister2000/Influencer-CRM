"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearAllInfluencersAction } from "@/app/actions/influencers";

/** Admin-only, destructive. Requires typing DELETE to prevent a misclick. */
export function DangerZone() {
  const [confirmText, setConfirmText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const canConfirm = confirmText.trim().toUpperCase() === "DELETE";

  function clearAll() {
    if (!canConfirm) return;
    setError(null);
    setResult(null);
    start(async () => {
      try {
        const r = await clearAllInfluencersAction();
        setResult(`Cleared ${r.influencers} influencer${r.influencers === 1 ? "" : "s"}, ${r.messages} message${r.messages === 1 ? "" : "s"}, ${r.notes} note${r.notes === 1 ? "" : "s"}, ${r.events} event${r.events === 1 ? "" : "s"}.`);
        setConfirmText("");
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Failed to clear data");
      }
    });
  }

  return (
    <div className="card p-4 border-red-200">
      <h3 className="font-medium text-red-700 text-sm mb-1">Danger zone</h3>
      <p className="text-xs text-ink-500 mb-3">
        Permanently deletes every influencer for this team, plus their messages, notes and
        activity timeline. Campaigns stay — re-run discovery on one to repopulate. This cannot be undone.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input w-48 text-sm"
          placeholder='Type "DELETE" to confirm'
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
        <button
          className="btn-danger"
          disabled={!canConfirm || pending}
          onClick={clearAll}
        >
          {pending ? "Clearing…" : "Clear all influencer data"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {result && <p className="text-xs text-emerald-700 mt-2">{result}</p>}
    </div>
  );
}
