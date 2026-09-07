"use client";

import { useState, useTransition } from "react";
import type { Tag } from "@/lib/services/discoveryTags";

/**
 * A chip picker backed by a per-team, user-managed list (locations,
 * categories, ...). Click a chip to select/deselect it for the current
 * search; "+" adds a new one to the saved list (and selects it); the small
 * "×" on a chip removes it from the saved list for good.
 */
export function TagPicker({
  label, hint, tags, selected, onToggle, onAdd, onRemove, addPlaceholder,
}: {
  label: string;
  hint?: string;
  tags: Tag[];
  selected: string[];
  onToggle: (name: string) => void;
  onAdd: (name: string) => Promise<Tag>;
  onRemove: (id: string) => Promise<void>;
  addPlaceholder: string;
}) {
  const [items, setItems] = useState(tags);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    const name = draft.trim();
    if (!name) return;
    setError(null);
    start(async () => {
      try {
        const tag = await onAdd(name);
        setItems((cur) => (cur.some((t) => t.id === tag.id) ? cur : [...cur, tag].sort((a, b) => a.name.localeCompare(b.name))));
        onToggle(tag.name);
        setDraft("");
      } catch (e: any) {
        setError(e?.message ?? "Failed to add");
      }
    });
  }

  function remove(t: Tag) {
    if (!confirm(`Remove "${t.name}" from your saved list?`)) return;
    setItems((cur) => cur.filter((x) => x.id !== t.id));
    if (selected.includes(t.name)) onToggle(t.name);
    start(async () => { await onRemove(t.id); });
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2 items-center">
        {items.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1">
            <button type="button"
              onClick={() => onToggle(t.name)}
              className={
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition " +
                (selected.includes(t.name)
                  ? "border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                  : "border-slate-200 text-ink-700 hover:bg-slate-50")
              }>
              {t.name}
            </button>
            <button type="button" title={`Remove ${t.name}`} disabled={pending}
              onClick={() => remove(t)}
              className="text-ink-400 hover:text-red-600 text-xs w-4 -ml-1">
              ×
            </button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <input
            className="input py-1 text-sm w-36"
            placeholder={addPlaceholder}
            value={draft}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          />
          <button type="button" className="btn-ghost py-1 px-2 text-xs" disabled={pending || !draft.trim()} onClick={add}>
            + Add
          </button>
        </span>
      </div>
      {hint && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
