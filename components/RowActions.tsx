"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setStatusAction, deleteInfluencerAction, scoreInfluencerAction, approveAndQueueAction,
} from "@/app/actions/influencers";
import type { Influencer, UserRole } from "@/lib/types";
import { can } from "@/lib/permissions";

export function RowActions({ influencer, role }: { influencer: Influencer; role: UserRole }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const writable = can.write(role);
  const deletable = can.delete(role);

  return (
    <div className="flex items-center justify-end gap-1">
      {influencer.outreach_status !== "approved_to_send" && influencer.outreach_status !== "sent" && (
        <button
          title="Approve → generate message → send queue"
          className="btn-primary px-2.5 py-1 text-xs"
          disabled={pending || !writable}
          onClick={() => start(async () => { await approveAndQueueAction(influencer.id); router.refresh(); })}
        >
          {pending ? "…" : "Approve"}
        </button>
      )}
      <button title="Re-score" className="btn-ghost px-2 py-1 text-xs" disabled={pending || !writable}
        onClick={() => start(async () => { await scoreInfluencerAction(influencer.id); router.refresh(); })}>
        ★
      </button>
      {influencer.status !== "rejected" && (
        <button title="Reject" className="btn-ghost px-2 py-1 text-xs text-amber-700" disabled={pending || !writable}
          onClick={() => start(async () => { await setStatusAction(influencer.id, { status: "rejected" }); })}>
          ✕
        </button>
      )}
      {deletable && (
        <button title="Delete" className="btn-ghost px-2 py-1 text-xs text-red-600" disabled={pending}
          onClick={() => start(async () => {
            if (confirm(`Delete @${influencer.instagram_username}?`)) {
              await deleteInfluencerAction(influencer.id);
            }
          })}>
          🗑
        </button>
      )}
    </div>
  );
}
