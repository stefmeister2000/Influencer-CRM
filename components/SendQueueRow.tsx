"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveMessageAction, markSentAction, markRepliedAction } from "@/app/actions/messages";
import type { UserRole } from "@/lib/types";
import { can } from "@/lib/permissions";

export function SendQueueRow({
  messageId, influencerId, state, role, body,
}: {
  messageId: string; influencerId: string; state: string; role: UserRole; body: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      <button className="btn-ghost py-1 text-xs" onClick={() => navigator.clipboard.writeText(body)}>Copy</button>
      {can.approveMessages(role) && state !== "approved_to_send" && (
        <button className="btn-ghost py-1 text-xs text-emerald-700" disabled={pending}
          onClick={() => start(async () => { await approveMessageAction(messageId, influencerId); router.refresh(); })}>
          Approve
        </button>
      )}
      {can.updateStatus(role) && (
        <button className="btn-primary py-1 text-xs" disabled={pending}
          onClick={() => start(async () => { await markSentAction(messageId, influencerId); router.refresh(); })}>
          Mark sent
        </button>
      )}
      {can.updateStatus(role) && (
        <button className="btn-ghost py-1 text-xs" disabled={pending}
          onClick={() => start(async () => { await markRepliedAction(messageId, influencerId); router.refresh(); })}>
          Replied
        </button>
      )}
    </div>
  );
}
