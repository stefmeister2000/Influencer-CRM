"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setScriptStatusAction, deleteScriptAction, updateScriptBodyAction, translateScriptAction,
} from "@/app/actions/content";
import type { ContentScript, ScriptStatus } from "@/lib/services/scripts";
import { SCRIPT_CATEGORIES } from "@/lib/ai/scriptWriter";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { can } from "@/lib/permissions";

const STATUSES: { value: ScriptStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "in_progress", label: "In progress", color: "bg-amber-100 text-amber-800" },
  { value: "video_made", label: "Video made", color: "bg-emerald-100 text-emerald-800" },
];

const catLabel = (v: string) => SCRIPT_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export function SavedScripts({ scripts, role }: { scripts: ContentScript[]; role: UserRole }) {
  const [filter, setFilter] = useState<ScriptStatus | "all">("all");
  const shown = filter === "all" ? scripts : scripts.filter((s) => s.status === filter);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-ink-900">Saved scripts ({scripts.length})</h2>
        <div className="flex gap-1">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
          {STATUSES.map((s) => (
            <Chip key={s.value} active={filter === s.value} onClick={() => setFilter(s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-500">
          No scripts here yet. Generate one above — it saves automatically as a draft.
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((s) => <ScriptCard key={s.id} script={s} role={role} />)}
        </div>
      )}
    </div>
  );
}

function ScriptCard({ script, role }: { script: ContentScript; role: UserRole }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(script.body);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const refresh = () => router.refresh();

  const preview = script.body.replace(/\s+/g, " ").slice(0, 110);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge bg-brand-50 text-brand-700">{catLabel(script.category)}</span>
            <span className="badge bg-slate-100 text-slate-600">
              {script.format === "linkedin" ? "LinkedIn" : "Video"}
            </span>
            {script.language === "ar" && <span className="badge bg-emerald-50 text-emerald-700">Arabic</span>}
            <StatusPill status={script.status} />
            <span className="text-xs text-ink-500">{formatDate(script.created_at)}</span>
          </div>
          {!open && <p className="text-sm text-ink-600 mt-2 truncate">{preview}…</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {can.write(role) && (
            <select
              className="input py-1 text-xs w-32"
              value={script.status}
              disabled={pending}
              onChange={(e) => start(async () => {
                await setScriptStatusAction(script.id, e.target.value as ScriptStatus);
                refresh();
              })}
            >
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}
          <button className="btn-ghost py-1 text-xs" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide" : "Open"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3">
          {editing ? (
            <textarea dir={script.language === "ar" ? "rtl" : "ltr"}
              className="input min-h-[220px] font-mono text-[13px] leading-relaxed"
              value={body} onChange={(e) => setBody(e.target.value)} />
          ) : (
            <pre dir={script.language === "ar" ? "rtl" : "ltr"}
              className="text-sm text-ink-800 whitespace-pre-wrap font-sans">{script.body}</pre>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            <button className="btn-ghost py-1 text-xs"
              onClick={() => { navigator.clipboard.writeText(script.body); setCopied(true); }}>
              {copied ? "Copied" : "Copy"}
            </button>
            {can.write(role) && script.language !== "ar" && (
              <button className="btn-ghost py-1 text-xs" disabled={pending}
                onClick={() => start(async () => { await translateScriptAction(script.id); refresh(); })}>
                {pending ? "Translating…" : "Translate to Arabic"}
              </button>
            )}
            {can.write(role) && !editing && (
              <button className="btn-ghost py-1 text-xs" onClick={() => setEditing(true)}>Edit</button>
            )}
            {can.write(role) && editing && (
              <>
                <button className="btn-primary py-1 text-xs" disabled={pending}
                  onClick={() => start(async () => {
                    await updateScriptBodyAction(script.id, body); setEditing(false); refresh();
                  })}>Save</button>
                <button className="btn-ghost py-1 text-xs"
                  onClick={() => { setBody(script.body); setEditing(false); }}>Cancel</button>
              </>
            )}
            {can.delete(role) && (
              <button className="btn-danger py-1 text-xs ml-auto" disabled={pending}
                onClick={() => start(async () => {
                  if (confirm("Delete this script?")) { await deleteScriptAction(script.id); refresh(); }
                })}>Delete</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ScriptStatus }) {
  const s = STATUSES.find((x) => x.value === status)!;
  return <span className={"badge " + s.color}>{s.label}</span>;
}

function Chip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className={"text-xs px-2.5 py-1 rounded-full border transition " +
        (active ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-slate-200 hover:bg-slate-50")}>
      {children}
    </button>
  );
}
