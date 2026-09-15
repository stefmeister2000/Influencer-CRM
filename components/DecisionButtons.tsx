"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStatusAction, deleteInfluencerAction, approveAndQueueAction } from "@/app/actions/influencers";
import type { Influencer, InfluencerStatus, UserRole } from "@/lib/types";
import { can } from "@/lib/permissions";

export function DecisionButtons({ influencer, role }: { influencer: Influencer; role: UserRole }) {
  const [pending, start] = useTransition();
  const [declining, setDeclining] = useState<InfluencerStatus | null>(null);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const writable = can.write(role);

  const set = (status: InfluencerStatus, reasonText?: string) =>
    start(async () => {
      await setStatusAction(influencer.id, { status, reason: reasonText });
      setDeclining(null);
      setReason("");
      router.refresh();
    });

  const approveQueue = () =>
    start(async () => { await approveAndQueueAction(influencer.id); router.refresh(); });

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">Decisions</h2>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-primary col-span-2" disabled={pending || !writable} onClick={approveQueue}>
          {pending ? "Working…" : "Approve → message → send queue"}
        </button>
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => set("approved")}>Approve only</button>
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => setDeclining("rejected")}>Reject</button>
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => set("interested")}>Mark interested</button>
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => set("negotiating")}>Negotiating</button>
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => set("onboarded")}>Mark onboarded</button>
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => setDeclining("not_interested")}>Not interested</button>
      </div>

      {declining && (
        <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <label className="text-xs font-medium text-amber-900">
            Why isn't this creator a fit? <span className="font-normal text-amber-700">(optional, but helps the AI avoid similar picks next time)</span>
          </label>
          <textarea
            autoFocus
            className="input mt-1.5 text-sm min-h-[70px]"
            placeholder="e.g. too much overlap with a competitor, audience skews wrong age, engagement looks fake…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex items-center gap-2 mt-2">
            <button className="btn-primary py-1 text-xs" disabled={pending}
              onClick={() => set(declining, reason.trim() || undefined)}>
              {pending ? "…" : reason.trim() ? "Confirm with reason" : "Confirm without reason"}
            </button>
            <button className="btn-ghost py-1 text-xs" disabled={pending}
              onClick={() => { setDeclining(null); setReason(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {can.delete(role) && (
        <button className="btn-danger w-full mt-2" disabled={pending}
          onClick={() => start(async () => {
            if (confirm("Delete this influencer?")) { await deleteInfluencerAction(influencer.id); router.push("/influencers"); }
          })}>
          Delete
        </button>
      )}
    </div>
  );
}
