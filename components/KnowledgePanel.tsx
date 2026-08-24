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
          <h2 className="font-semibold text-ink-900">Brand knowledge</h2>
          <p className="text-xs text-ink-500">
            Tell the AI about ORVION, your pages, offers and audience so every script is on-point.
            {initial ? "" : " (empty — add some)"}
          </p>
        </div>
        <span className="text-ink-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3">
          <textarea
            className="input min-h-[160px]"
            placeholder={`e.g.
- ORVION is a UAE online doctor-reviewed health platform (orvionresearch.com).
- Weight loss: medical program, consultations online, discreet.
- Hair loss (men) and women's hair: treatment plans reviewed by doctors.
- Peptides: wellness/recovery/performance, science-led.
- Tone: premium, trustworthy, modern, not salesy.
- Audience: UAE, English + Arabic, 25-45.
- Always drive to: link in bio / book a consultation.`}
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
