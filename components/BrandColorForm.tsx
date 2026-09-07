"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveThemeColorAction } from "@/app/actions/team";

/**
 * Admin-only: this team's brand color. Every team gets its own — nothing here
 * is hardcoded to one company, so adding a second business to this software
 * just means a second team with its own color (and business profile).
 */
export function BrandColorForm({ initial }: { initial: string | null }) {
  const [hex, setHex] = useState(initial ?? "#2563eb");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save(value: string | null) {
    setError(null);
    setSaved(false);
    start(async () => {
      try {
        await saveThemeColorAction(value);
        setSaved(true);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Failed to save");
      }
    });
  }

  return (
    <div className="card p-4">
      <h3 className="font-medium text-ink-900 text-sm mb-1">Brand color</h3>
      <p className="text-xs text-ink-500 mb-2">
        Sets the accent color across the app for your team only — other companies using this
        software keep their own color.
      </p>
      <div className="flex items-center gap-2">
        <input type="color" value={hex} onChange={(e) => setHex(e.target.value)}
          className="w-10 h-9 rounded border border-slate-200 cursor-pointer p-0.5" />
        <input className="input w-32 font-mono text-sm" value={hex}
          onChange={(e) => setHex(e.target.value)} placeholder="#2563eb" />
        <button className="btn-primary shrink-0" disabled={pending} onClick={() => save(hex)}>
          {pending ? "Saving…" : "Save"}
        </button>
        {initial && (
          <button className="btn-ghost shrink-0" disabled={pending} onClick={() => { setHex("#2563eb"); save(null); }}>
            Reset to default
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {saved && !error && <p className="text-xs text-emerald-700 mt-1">Saved ✓ — refresh to see it everywhere.</p>}
    </div>
  );
}
