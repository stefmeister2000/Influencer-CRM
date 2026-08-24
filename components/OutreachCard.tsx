"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  tuneMessageAction, saveMessageBodyAction, deleteMessageAction,
  markSentAction, markRepliedAction, approveMessageAction,
} from "@/app/actions/messages";
import { Avatar } from "@/components/ui";
import { HandleActions } from "@/components/HandleActions";
import { titleCase } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { can } from "@/lib/permissions";

type Item = {
  id: string; kind: string; channel: string; state: string; body: string;
  influencer?: {
    id: string; instagram_username: string; full_name: string | null;
    profile_picture_url: string | null; whatsapp?: string | null; email?: string | null;
  };
};

export function OutreachCard({ item, role }: { item: Item; role: UserRole }) {
  const inf = item.influencer;
  const [body, setBody] = useState(item.body);
  const [tune, setTune] = useState("");
  const [showTune, setShowTune] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = body !== item.body;

  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  const handle = (inf?.instagram_username ?? "").replace(/^@/, "");
  const waNumber = (inf?.whatsapp ?? "").replace(/[^\d]/g, "");
  const subject = "Quick idea for a partnership with ORVION";

  // Instagram can't pre-fill DM text — so we copy the message, THEN open the DM.
  function dmInstagram() {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    window.open(`https://ig.me/m/${handle}`, "_blank", "noopener");
  }

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <Avatar src={inf?.profile_picture_url} name={inf?.full_name} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/influencers/${inf?.id}`} className="font-medium hover:text-brand-700">
              {inf?.full_name ?? inf?.instagram_username}
            </Link>
            <span className="text-xs text-ink-500">@{inf?.instagram_username} · {titleCase(item.kind)} · {item.channel}</span>
            <HandleActions username={inf?.instagram_username ?? ""} />
            <span className="badge bg-brand-50 text-brand-700">{titleCase(item.state)}</span>
          </div>

          {/* Editable message */}
          <textarea
            className="input mt-2 min-h-[110px] text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          {/* Tune panel */}
          {showTune && (
            <div className="mt-2 flex gap-2">
              <input
                className="input text-sm"
                placeholder="Tell AI how to adjust it — e.g. shorter, more casual, mention their barbershop…"
                value={tune}
                onChange={(e) => setTune(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tune.trim()) {
                    run(async () => { const r = await tuneMessageAction(item.id, tune); setBody(r.body); setTune(""); });
                  }
                }}
              />
              <button
                className="btn-primary text-xs whitespace-nowrap"
                disabled={pending || !tune.trim()}
                onClick={() => run(async () => { const r = await tuneMessageAction(item.id, tune); setBody(r.body); setTune(""); })}
              >
                {pending ? "Tuning…" : "Adjust with AI"}
              </button>
            </div>
          )}

          {/* Send buttons — pre-filled where the platform allows it */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button className="btn-primary py-1 text-xs" onClick={dmInstagram}>
              {copied ? "Copied — paste in IG (⌘V)" : "DM on Instagram →"}
            </button>
            {waNumber && (
              <a className="btn-ghost py-1 text-xs text-emerald-700" target="_blank" rel="noreferrer"
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(body)}`}>
                WhatsApp (pre-filled)
              </a>
            )}
            {inf?.email && (
              <a className="btn-ghost py-1 text-xs" target="_blank" rel="noreferrer"
                href={`mailto:${inf.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
                Email (pre-filled)
              </a>
            )}
            <button className="btn-ghost py-1 text-xs"
              onClick={() => { navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button className="btn-ghost py-1 text-xs" onClick={() => setShowTune((s) => !s)}>
              {showTune ? "Hide tune" : "Tune ✦"}
            </button>
            {can.write(role) && dirty && (
              <button className="btn-primary py-1 text-xs" disabled={pending}
                onClick={() => run(async () => { await saveMessageBodyAction(item.id, body); })}>
                Save edits
              </button>
            )}
            {can.approveMessages(role) && item.state !== "approved_to_send" && (
              <button className="btn-ghost py-1 text-xs text-emerald-700" disabled={pending}
                onClick={() => run(async () => { await approveMessageAction(item.id, inf!.id); })}>
                Approve
              </button>
            )}
            {can.updateStatus(role) && (
              <button className="btn-primary py-1 text-xs" disabled={pending}
                onClick={() => run(async () => { await markSentAction(item.id, inf!.id); })}>
                Mark sent
              </button>
            )}
            {can.updateStatus(role) && (
              <button className="btn-ghost py-1 text-xs" disabled={pending}
                onClick={() => run(async () => { await markRepliedAction(item.id, inf!.id); })}>
                Replied
              </button>
            )}
            {can.write(role) && (
              <button className="btn-danger py-1 text-xs ml-auto" disabled={pending}
                onClick={() => { if (confirm(`Delete this message and decline @${handle}?`)) run(async () => { await deleteMessageAction(item.id); }); }}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
