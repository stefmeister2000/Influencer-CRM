"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStatusAction, deleteInfluencerAction, approveAndQueueAction } from "@/app/actions/influencers";
import type { Influencer, InfluencerStatus, UserRole } from "@/lib/types";
import { can } from "@/lib/permissions";

export function DecisionButtons({ influencer, role }: { influencer: Influencer; role: UserRole }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const writable = can.write(role);

  const set = (status: InfluencerStatus) =>
    start(async () => { await setStatusAction(influencer.id, { status }); router.refresh(); });

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
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => set("rejected")}>Reject</button>
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => set("interested")}>Mark interested</button>
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => set("negotiating")}>Negotiating</button>
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => set("onboarded")}>Mark onboarded</button>
        <button className="btn-ghost" disabled={pending || !writable} onClick={() => set("not_interested")}>Not interested</button>
      </div>
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
