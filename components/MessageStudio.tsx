"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateMessageAction, approveMessageAction, editMessageAction,
  markSentAction, markRepliedAction, setMessageStateAction,
} from "@/app/actions/messages";
import { MESSAGE_KINDS } from "@/lib/constants";
import type { Message, MessageKind, UserRole } from "@/lib/types";
import { can } from "@/lib/permissions";
import { titleCase } from "@/lib/utils";

export function MessageStudio({
  influencerId, messages, role, defaultKind,
}: {
  influencerId: string; messages: Message[]; role: UserRole; defaultKind: MessageKind;
}) {
  const [kind, setKind] = useState<MessageKind>(defaultKind);
  const [pending, start] = useTransition();
  const router = useRouter();
  const writable = can.write(role);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Outreach messages</h2>
        <div className="flex gap-2">
          <select className="input py-1.5 w-44" value={kind} onChange={(e) => setKind(e.target.value as MessageKind)}>
            {MESSAGE_KINDS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button className="btn-primary" disabled={pending || !writable}
            onClick={() => start(async () => { await generateMessageAction(influencerId, kind); router.refresh(); })}>
            {pending ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      {messages.length === 0 ? (
        <p className="text-sm text-ink-500">No messages yet. Pick a type and generate a personalized draft.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <MessageCard key={m.id} message={m} influencerId={influencerId} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageCard({ message, influencerId, role }: { message: Message; influencerId: string; role: UserRole }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(message.body);
  const [pending, start] = useTransition();
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="badge bg-slate-100 text-slate-700">{titleCase(message.kind)}</span>
          <span className="badge bg-brand-50 text-brand-700">{titleCase(message.state)}</span>
          <span className="text-ink-500">{message.channel} · {message.language}</span>
          {message.compliance_passed === false && (
            <span className="badge bg-amber-100 text-amber-800" title={message.compliance_notes ?? ""}>⚠ compliance</span>
          )}
        </div>
      </div>

      {editing ? (
        <textarea className="input min-h-[120px]" value={body} onChange={(e) => setBody(e.target.value)} />
      ) : (
        <p className="text-sm text-ink-800 whitespace-pre-wrap">{message.body}</p>
      )}
      {message.compliance_passed === false && message.compliance_notes && (
        <p className="text-xs text-amber-700 mt-1">Issues: {message.compliance_notes}</p>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {editing ? (
          <>
            <button className="btn-primary py-1 text-xs" disabled={pending}
              onClick={() => start(async () => { await editMessageAction(message.id, body); setEditing(false); refresh(); })}>Save</button>
            <button className="btn-ghost py-1 text-xs" onClick={() => { setBody(message.body); setEditing(false); }}>Cancel</button>
          </>
        ) : (
          <>
            {can.write(role) && <button className="btn-ghost py-1 text-xs" onClick={() => setEditing(true)}>Edit</button>}
            {can.approveMessages(role) && message.state !== "approved_to_send" && (
              <button className="btn-ghost py-1 text-xs text-emerald-700" disabled={pending}
                onClick={() => start(async () => { await approveMessageAction(message.id, influencerId); refresh(); })}>Approve to send</button>
            )}
            {can.write(role) && (
              <button className="btn-ghost py-1 text-xs" disabled={pending}
                onClick={() => start(async () => { await setMessageStateAction(message.id, "do_not_send"); refresh(); })}>Do not send</button>
            )}
            {can.updateStatus(role) && (
              <button className="btn-ghost py-1 text-xs text-brand-700" disabled={pending}
                onClick={() => start(async () => { await markSentAction(message.id, influencerId); refresh(); })}>Mark sent</button>
            )}
            {can.updateStatus(role) && (
              <button className="btn-ghost py-1 text-xs" disabled={pending}
                onClick={() => start(async () => { await markRepliedAction(message.id, influencerId); refresh(); })}>Mark replied</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
