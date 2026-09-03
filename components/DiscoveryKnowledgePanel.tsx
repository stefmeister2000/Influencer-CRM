"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveKnowledgeAction } from "@/app/actions/business";

/**
 * A running notes field you keep adding to over time — niche details, what's
 * worked, creator types to favor/avoid, anything Claude should factor in.
 * Feeds discovery, scoring and message generation alongside the business profile.
 */
export function DiscoveryKnowledgePanel({ initial }: { initial: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="card p-5">
      <button
        className="w-full flex items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <h2 className="font-semibold text-ink-900">Knowledge base</h2>
          <p className="text-sm text-ink-500">
            Keep adding notes — niche specifics, creator types that convert, things to avoid.
            Feeds discovery, scoring and message generation alongside your business profile.
            {initial ? "" : " (empty — add some)"}
          </p>
        </div>
        <span className="text-ink-500 shrink-0 ml-3">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3">
          <textarea
            className="input min-h-[140px]"
            placeholder={`e.g.
- Best-performing creators so far: casual food/nightlife voices, not polished ads.
- Avoid: fitness-only accounts, no crossover with our audience.
- Ghent students respond best to free-entry + food angle; NL audience prefers the sports angle.
- New: added a vegan menu — worth mentioning to food creators.`}
            value={text}
            onChange={(e) => { setText(e.target.value); setSaved(false); }}
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              className="btn-primary"
              disabled={pending}
              onClick={() => start(async () => {
                await saveKnowledgeAction(text);
                setSaved(true);
                router.refresh();
              })}
            >
              {pending ? "Saving…" : "Save knowledge"}
            </button>
            {saved && <span className="text-sm text-emerald-700">Saved ✓</span>}
          </div>
        </div>
      )}
    </div>
  );
}
