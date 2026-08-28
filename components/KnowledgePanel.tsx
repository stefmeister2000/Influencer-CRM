"use client";

import { useState, useTransition } from "react";
import { saveKnowledgeAction } from "@/app/actions/content";

export function KnowledgePanel({ initial }: { initial: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="card p-4 mb-4">
      <button
        className="w-full flex items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <h2 className="font-semibold text-ink-900">Context / knowledge (optional)</h2>
          <p className="text-xs text-ink-500">
            Optional. Tell the AI who this content is for, your positioning, offers, links and tone so every script fits.
            {initial ? "" : " (empty)"}
          </p>
        </div>
        <span className="text-ink-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3">
          <textarea
            className="input min-h-[160px]"
            placeholder={`e.g.
- Who this is for: [audience / niche].
- What we do / sell: [product, service or personal brand].
- Positioning & tone: [e.g. premium, playful, contrarian, expert].
- Key offers / links: [link in bio, waitlist, book a call…].
- Anything to always mention or always avoid.`}
            value={text}
            onChange={(e) => { setText(e.target.value); setSaved(false); }}
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              className="btn-primary"
              disabled={pending}
              onClick={() => start(async () => { await saveKnowledgeAction(text); setSaved(true); })}
            >
              {pending ? "Saving…" : "Save knowledge"}
            </button>
            {saved && <span className="text-sm text-emerald-700">Saved ✓ — future scripts will use this.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
